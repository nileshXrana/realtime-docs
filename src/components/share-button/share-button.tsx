"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Snackbar from "@mui/material/Snackbar";
import { enableLinkSharing } from "@/services/firebase";
import styles from "./share-button.module.css";

interface ShareButtonProps {
  docId: string;
}

export default function ShareButton({ docId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      // enable public link sharing
      await enableLinkSharing(docId);
      
      // generate the invite link and copy to clipboard
      const inviteUrl = `${window.location.origin}/editor/${docId}`;
      await navigator.clipboard.writeText(inviteUrl);
      
      setCopied(true);
    } catch (err) {
      console.error("Failed to share document:", err);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ShareIcon />}
        onClick={handleShare}
        size="small"
        className={styles.shareButton}
      >
        Share Link
      </Button>
      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        message="Invite link copied to clipboard!"
      />
    </>
  );
}
