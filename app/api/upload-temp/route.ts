/**
 * POST /api/upload-temp
 * Uploads files to Supabase storage and returns URLs
 * Used to bypass sessionStorage size limits for large images
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

const VALID_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 6;

export async function POST(request: NextRequest) {
  try {
    console.log('[upload-temp] Starting file upload...');
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    console.log(`[upload-temp] Received ${files.length} files`);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${MAX_FILES} pages allowed.` },
        { status: 400 }
      );
    }

    // Validate all files
    for (const file of files) {
      if (!VALID_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Please upload PDF or image files.` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 10MB per file.` },
          { status: 400 }
        );
      }
    }

    const supabase = getServiceRoleClient();
    const uploadedFiles: Array<{ fileName: string; fileType: string; url: string }> = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'png';
      const uniqueFileName = `temp/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('menu-uploads')
        .upload(uniqueFileName, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading file to storage:', error);
        return NextResponse.json(
          { error: `Failed to upload ${file.name}` },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('menu-uploads')
        .getPublicUrl(data.path);

      uploadedFiles.push({
        fileName: file.name,
        fileType: file.type,
        url: urlData.publicUrl,
      });
    }

    return NextResponse.json({ files: uploadedFiles }, { status: 200 });
  } catch (error) {
    console.error('Error in upload-temp:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while uploading files' },
      { status: 500 }
    );
  }
}
