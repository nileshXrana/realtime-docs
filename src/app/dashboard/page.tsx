"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Skeleton from "@mui/material/Skeleton";
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import { subscribeAuth, subscribeUserDocs, createDocument, logout } from "../../services/firebase";
import styles from "./dashboard.module.css";
import AccountMenu from "@/components/account-menu/account-menu";

interface Doc {
  docId: string;
  ownerId: string;
  title: string;
  createdAt: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAuth((currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeUserDocs(user.uid, (fetchedDocs) => {
      setDocs(fetchedDocs as Doc[]);
      setDocsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateDoc = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const docId = await createDocument(user.uid);
      router.push(`/editor/${docId}`);
    } catch (error) {
      console.error(error);
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || docsLoading) {
    return (
      <Container className={styles.loadingContainer}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <Box className={styles.header}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon sx={{ color: '#1a73e8', fontSize: 32 }} />
          <Typography variant="h5" className={styles.title}>
            Realtime Docs
          </Typography>
        </Box>
        <Box className={styles.headerActions}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDoc}
            disabled={creating}
            className={styles.createButton}
            disableElevation
          >
            {creating ? "Creating..." : "Create Doc"}
          </Button>
          {/* google profile */}
          {user && (
            <AccountMenu user={user} handleLogout={handleLogout} />
          )}
        </Box>
      </Box>

      {docs.length === 0 ? (
        <Box className={styles.emptyState}>
          <DescriptionIcon sx={{ fontSize: 80, color: '#dadce0', marginBottom: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#3c4043', marginBottom: 1 }}>
            No documents yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ marginBottom: 3 }}>
            Create a new document to start collaborating in real-time.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDoc}
            disabled={creating}
            className={styles.createButton}
            disableElevation
          >
            {creating ? "Creating..." : "Create Doc"}
          </Button>
        </Box>
      ) : (
        <Box className={styles.docGrid}>
          {docs.map((doc) => (
            <Card key={doc.docId} className={styles.docCard} variant="outlined">
              <CardActionArea onClick={() => router.push(`/editor/${doc.docId}`)}>
                <Box className={styles.docThumbnail}>
                  <Skeleton variant="text" width="40%" height={20} animation={false} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                  <Skeleton variant="rectangular" width="75%" height={8} animation={false} sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: '4px' }} />
                  <Skeleton variant="rectangular" width="85%" height={8} animation={false} sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: '4px' }} />
                  <Skeleton variant="rectangular" width="60%" height={8} animation={false} sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: '4px' }} />
                </Box>
                <CardContent className={styles.docContent}>
                  <Typography variant="subtitle1" noWrap className={styles.docTitle}>
                    {doc.title}
                  </Typography>
                  <Box className={styles.docFooter}>
                    <DescriptionIcon sx={{ color: '#1a73e8', fontSize: 16 }} />
                    <Typography variant="body2" className={styles.docDate}>
                      {new Date(doc.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
