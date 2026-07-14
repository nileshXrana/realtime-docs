import React from 'react'
import Box from '@mui/material/Box';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'
import styles from './simple-editor.module.css'

const page = (params: Promise<{ docId: string }>) => {
    return (
        <SimpleEditor params={params} />
    )
}

export default page