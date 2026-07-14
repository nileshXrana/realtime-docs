import Link from 'next/link'
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function NotFound() {
  return (
    <Box style={{ width: '100vw', height: '100vh', textAlign: 'center', padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{}} variant="h2">404</Typography>
      <Typography variant="h3">Page Not Found</Typography>
      <Typography variant="h6">Could not find requested page</Typography>
      <Link href="/" style={{ textDecoration: 'underline', marginTop: '10px', color: '#1418ffef', fontWeight: 'bold', fontSize: '16px' }}>
        Return Home
      </Link>
    </Box>
  )
}