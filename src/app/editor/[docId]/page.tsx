"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import { useEditor } from "@tiptap/react";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { subscribeAuth, joinAsCollaborator, getDocument, saveDocumentTitle, saveDocumentContent, getUserById, enableLinkSharing } from "@/services/firebase";
import styles from "./editor.module.css";
import { styled, alpha } from '@mui/material/styles';
import Menu, { MenuProps } from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { SimpleEditorUI, simpleEditorExtensions, simpleEditorProps } from "@/components/tiptap-templates/simple/simple-editor";
import "@/components/tiptap-templates/simple/simple-editor.scss";
import { useDebouncedCallback } from "use-debounce";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import QRCodeGenerator from "@/components/qrcode/qrcode";
import Snackbar from "@mui/material/Snackbar";

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

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
}));



export default function EditorPage({ params }: { params: Promise<{ docId: string }> }) {
  const isUpdatingRef = useRef(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareSelect = async (e: SelectChangeEvent) => {
    const value = e.target.value;
    if (value === "link") {
      try {
        await enableLinkSharing(docId);
        const inviteUrl = `${window.location.origin}/editor/${docId}`;
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
      } catch (err) {
        console.error("Failed to share document:", err);
      }
    } else if (value === "qr") {
      setQrDialogOpen(true);
    }
  };


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
    immediatelyRender: false,
    editorProps: simpleEditorProps,
    extensions: simpleEditorExtensions,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      const jsonContent = editor.getJSON();
      const db = getDatabase();
      set(ref(db, `docs/${docId}/content`), JSON.parse(JSON.stringify(jsonContent)));
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

  const debouncedSaveTitle = useDebouncedCallback(async (newTitle: string) => {
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

  const debouncedSave = useDebouncedCallback(async (html: string) => {
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
    <Container className={styles.container} maxWidth="md">
      <Box className={styles.header}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="text"
            onClick={() => router.push("/dashboard")}
            className={styles.backButton}
          >
            Back to Dashboard
          </Button>
        </Box>
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="share-select-label" sx={{ fontSize: '0.875rem' }}>Share</InputLabel>
            <Select
              labelId="share-select-label"
              id="share-select"
              value=""
              label="Share"
              onChange={handleShareSelect}
              sx={{ height: 36, fontSize: '0.875rem' }}
            >
              <MenuItem value="link" sx={{ fontSize: '0.875rem' }}>Share Link</MenuItem>
              <MenuItem value="qr" sx={{ fontSize: '0.875rem' }}>Share QR</MenuItem>
            </Select>
          </FormControl>

          <Button
            id="demo-customized-button"
            aria-controls={open ? 'demo-customized-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open}
            variant="contained"
            disableElevation
            onClick={handleClick}
            endIcon={<KeyboardArrowDownIcon />}
            size="small"
            sx={{ textTransform: 'none', height: 36 }}
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

      <Box className={styles.editorWrapper}>
        <SimpleEditorUI editor={editor} />
      </Box>

      <BootstrapDialog
        onClose={() => setQrDialogOpen(false)}
        aria-labelledby="customized-dialog-title"
        open={qrDialogOpen}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
          Scan QR Code to Edit Document
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={() => setQrDialogOpen(false)}
          sx={(theme) => ({
            position: 'absolute',
            right: 8,
            top: 8,
            color: theme.palette.grey[500],
          })}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent dividers>
          <QRCodeGenerator url={`${window.location.origin}/editor/${docId}`} />
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setQrDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </BootstrapDialog>

      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        message="Invite link copied to clipboard!"
      />
    </Container>
  );
}
