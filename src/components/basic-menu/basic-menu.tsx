import * as React from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import DescriptionIcon from '@mui/icons-material/Description';  

export default function BasicMenu({ handleShareSelect }: { handleShareSelect: (option: string) => void }) {
    const id = React.useId();
    const buttonId = `${id}-button`;
    const menuId = `${id}-menu`;
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <div>
            <Button
                variant="outlined"
                id={buttonId}
                aria-controls={open ? menuId : undefined}
                aria-haspopup="true"
                aria-expanded={open}
                onClick={handleClick}
                sx={{ display: 'flex', gap: 0.2, padding: 1}}
            >
                <DescriptionIcon sx={{width: 20, height: 20}}/>
                Share
            </Button>
            <Menu
                id={menuId}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                slotProps={{
                    list: {
                        'aria-labelledby': buttonId,
                    },
                }}
            >
                <MenuItem onClick={() => {
                    handleClose();
                    handleShareSelect('link');
                }}>Share Link</MenuItem>
                <MenuItem onClick={() => {
                    handleClose();
                    handleShareSelect('qr');
                }}>Share QR</MenuItem>
            </Menu>
        </div>
    );
}
