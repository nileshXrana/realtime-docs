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
import { getDatabase, ref, onValue, set } from "firebase/database";
import { subscribeAuth, joinAsCollaborator, getDocument, saveDocumentTitle, saveDocumentContent, getUserById } from "@/services/firebase";
import ShareButton from "@/components/share-button/share-button";
import styles from "./editor.module.css";
import { styled, alpha } from '@mui/material/styles';
import Menu, { MenuProps } from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CustomizedDialogs from "@/components/dialog/dialog";

const StyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    color: 'rgb(55, 65, 81)',
    boxShadow:
      'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    '& .MuiMenu-list': {
      padding: '4px 0',
    },
    '& .MuiMenuItem-root': {
      '& .MuiSvgIcon-root': {
        fontSize: 18,
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
        ...theme.applyStyles('dark', {
          color: 'inherit',
        }),
      },
      '&:active': {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity,
        ),
      },
    },
    ...theme.applyStyles('dark', {
      color: theme.palette.grey[300],
    }),
  },
}));

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
  const isUpdatingRef = useRef(false);


  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const { docId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [joining, setJoining] = useState(false);
  const isLoadedRef = useRef(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);

  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;

      const jsonContent = editor.getJSON();
      const db = getDatabase();

      // Save content to db
      set(ref(db, `docs/${docId}/content`), jsonContent);
    },
  });

  useEffect(() => {
    const unsubscribe = subscribeAuth(async (currentUser) => {
      if (!currentUser) {
        const currentPath = window.location.pathname;
        router.push(`/?redirect=${encodeURIComponent(currentPath)}`);
        return;
      } else {
        setUser(currentUser);
        try {
          setJoining(true);
          await joinAsCollaborator(docId, currentUser.uid);
          setJoining(false);
        } catch (err: any) {
          console.error(err);
          setJoining(false);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // rerender the editor when any user edits the document, so that the content is always up-to-date
  useEffect(() => {
    if (!editor || !user) return;

    const loadContent = async () => {
      try {
        const doc = await getDocument(docId);
        if (doc) {
          setTitle(doc.title || "Untitled Document");
          editor.commands.setContent(doc.content || "");
          if (doc.collaborators) {
            const collaboratorDetails = await Promise.all(
              Object.keys(doc.collaborators).map(async (id) => {
                const collaborator = await getUserById(id);
                setCollaborators(prev => [...prev, collaborator?.email || id]);
              })
            );
          }
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

    const db = getDatabase();
    const contentRef = ref(db, `docs/${docId}/content`);

    const unsubscribe = onValue(contentRef, (snapshot) => {
      const remoteContent = snapshot.val();

      if (remoteContent) {
        const localContent = editor.getJSON();

        if (JSON.stringify(localContent) !== JSON.stringify(remoteContent)) {
          isUpdatingRef.current = true;

          const { from, to } = editor.state.selection;
          editor.commands.setContent(remoteContent);

          try {
            editor.commands.setTextSelection({ from, to });
          } catch (e) {
          }

          isUpdatingRef.current = false;
        }
      }
    });

    const handleUpdate = () => {
      if (!isLoadedRef.current) return;

      const currentContent = editor.getHTML();
      debouncedSave(currentContent);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      unsubscribe();
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
          slotProps={{
            htmlInput: {
              style: {
                textAlign: 'center',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              },
            },
          }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <CustomizedDialogs url={`${window.location.origin}/editor/${docId}`} />
          <ShareButton docId={docId} />
        </Box>
      </Box>

      <Box className={styles.editorWrapper}>
        <Box className={styles.toolbar}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`${styles.toolbarButton} ${editor?.isActive("bold") ? styles.activeButton : ""
                }`}
            >
              Bold
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`${styles.toolbarButton} ${editor?.isActive("italic") ? styles.activeButton : ""
                }`}
            >
              Italic
            </Button>
          </Box>

          <Box>
            <Button
              id="demo-customized-button"
              aria-controls={open ? 'demo-customized-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open}
              variant="contained"
              disableElevation
              onClick={handleClick}
              endIcon={<KeyboardArrowDownIcon />}
            >
              Collaborators ({collaborators.length})
            </Button>
            <StyledMenu
              id="demo-customized-menu"
              slotProps={{
                list: {
                  'aria-labelledby': 'demo-customized-button',
                },
              }}
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
            >
              {collaborators.map((collaboratorId) => (
                <MenuItem key={collaboratorId} onClick={handleClose}>
                  {collaboratorId}
                </MenuItem>
              ))}
            </StyledMenu>
          </Box>

        </Box>
        <EditorContent editor={editor} className={styles.editorArea} />
      </Box>
    </Container>
  );
}
