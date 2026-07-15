"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Image from "next/image";
import { subscribeAuth, loginWithGoogle, saveUser } from "../services/firebase";
import styles from "./page.module.css";
import { useParams } from 'next/navigation'
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DraftsIcon from '@mui/icons-material/Drafts';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import GroupsIcon from '@mui/icons-material/Groups';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';



export default function Home() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const params = useParams<{ redirect: string }>()

  useEffect(() => {
    const unsubscribe = subscribeAuth((currentUser) => {
      if (currentUser) {
        router.push("/dashboard");
      } else {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        await saveUser(user.uid, user.displayName, user.email, user.photoURL);
        const redirectTo = params?.redirect ? `/${params.redirect}` : "/dashboard";
        console.log("Redirecting to:", redirectTo);
        router.push(redirectTo);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Container className={styles.container}>
        <Box className={styles.card}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <Box className={styles.card}>
        <Box className={styles.stack}>
          <Typography variant="h4" className={styles.title}>
            Realtime Docs
          </Typography>
          <Typography variant="body1" className={styles.subtitle}>
            A simple, real-time document editor
          </Typography>

          <Box className={styles.features}>

            <List>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <DocumentScannerIcon />
                  </ListItemIcon>
                  <ListItemText primary="Create Document" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <GroupsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Real-Time Collaboration" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <ScreenShareIcon />
                  </ListItemIcon>
                  <ListItemText primary="Share with anyone" />
                </ListItemButton>
              </ListItem>
            </List>

          </Box>
        </Box>
        <Box className={styles.stack}>
          {loading ? (
            <CircularProgress size={30} />
          ) : (
            <Button
              variant="outlined"
              onClick={handleLogin}
              className={styles.button}
              disableElevation
            >
              <Image
                src="/google.svg"
                alt="Google Logo"
                width={20}
                height={20}
              />
              Sign in with Google
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
}