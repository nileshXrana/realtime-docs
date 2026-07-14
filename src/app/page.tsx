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

export default function Home() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);

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
        await saveUser(user.uid, user.displayName, user.email);
        router.push("/dashboard");
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
                width={18}
                height={18}
              />
              Sign in with Google
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
}