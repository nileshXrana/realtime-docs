"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { subscribeAuth, getDocument, saveDocumentTitle, saveDocumentContent } from "../../../services/firebase";
import styles from "./editor.module.css";

function useDebounce<Args extends unknown[], R>(fn: (...args: Args) => R, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFn = (...args: Args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

export default function EditorPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const isLoadedRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
  });

  useEffect(() => {
    const unsubscribe = subscribeAuth((currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!editor || !user) return;

    const loadContent = async () => {
      try {
        const doc = await getDocument(docId);
        if (doc) {
          setTitle(doc.title || "Untitled Document");
          editor.commands.setContent(doc.content || "");
        }
        isLoadedRef.current = true;
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [docId, editor, user]);

  const debouncedSaveTitle = useDebounce(async (newTitle: string) => {
    try {
      await saveDocumentTitle(docId, newTitle);
    } catch (error) {
      console.error(error);
    }
  }, 1000);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSaveTitle(newTitle);
  };

  const debouncedSave = useDebounce(async (html: string) => {
    try {
      await saveDocumentContent(docId, html);
    } catch (error) {
      console.error(error);
    }
  }, 1000);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (!isLoadedRef.current) return;
      const html = editor.getHTML();
      debouncedSave(html);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, debouncedSave]);

  if (authLoading || loading) {
    return (
      <Container className={styles.loadingContainer}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <Box className={styles.header}>
        <Button
          variant="text"
          onClick={() => router.push("/dashboard")}
          className={styles.backButton}
        >
          Back to Dashboard
        </Button>
        <TextField
          variant="outlined"
          value={title}
          onChange={handleTitleChange}
          className={styles.titleInput}
        />
        <Box />
      </Box>

      <Box className={styles.editorWrapper}>
        <Box className={styles.toolbar}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`${styles.toolbarButton} ${
              editor?.isActive("bold") ? styles.activeButton : ""
            }`}
          >
            Bold
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`${styles.toolbarButton} ${
              editor?.isActive("italic") ? styles.activeButton : ""
            }`}
          >
            Italic
          </Button>
        </Box>
        <EditorContent editor={editor} className={styles.editorArea} />
      </Box>
    </Container>
  );
}
