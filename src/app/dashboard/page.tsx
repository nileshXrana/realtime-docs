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
import { subscribeAuth, subscribeUserDocs, createDocument, logout } from "../../services/firebase";
import styles from "./dashboard.module.css";

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
        <Typography variant="h5" className={styles.title}>
          Realtime Docs
        </Typography>
        <Box className={styles.headerActions}>
          <Button
            variant="contained"
            onClick={handleCreateDoc}
            disabled={creating}
            className={styles.createButton}
            disableElevation
          >
            {creating ? "Creating..." : "Create Doc"}
          </Button>
          <Button
            variant="text"
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Sign Out
          </Button>
        </Box>
      </Box>

      {docs.length === 0 ? (
        <Box className={styles.emptyState}>
          <Typography variant="body1" color="textSecondary">
            No documents yet. Create one to get started!
          </Typography>
        </Box>
      ) : (
        <Box className={styles.docGrid}>
          {docs.map((doc) => (
            <Card key={doc.docId} className={styles.docCard} variant="outlined">
              <CardActionArea onClick={() => router.push(`/editor/${doc.docId}`)}>
                <CardContent>
                  <Typography variant="subtitle1" noWrap className={styles.docTitle}>
                    {doc.title}
                  </Typography>
                  <Typography variant="body2" className={styles.docDate}>
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
