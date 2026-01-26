/**
 * POST /api/upload-temp
 * Generates signed upload URLs for direct client-to-Supabase uploads
 * This bypasses serverless function body size limits (4.5MB on Vercel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

const VALID_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILES = 6;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files } = body as { files: Array<{ fileName: string; fileType: string }> };

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

    // Validate file types
    for (const file of files) {
      if (!VALID_TYPES.includes(file.fileType)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.fileName}. Please upload PDF or image files.` },
          { status: 400 }
        );
      }
    }

    const supabase = getServiceRoleClient();
    const signedUrls: Array<{
      fileName: string;
      fileType: string;
      uploadUrl: string;
      filePath: string;
      publicUrl: string;
    }> = [];

    for (const file of files) {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = file.fileName.split('.').pop() || 'png';
      const filePath = `temp/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

      // Create signed upload URL (valid for 5 minutes)
      const { data, error } = await supabase.storage
        .from('menu-uploads')
        .createSignedUploadUrl(filePath);

      if (error) {
        console.error('Error creating signed URL:', error);
        return NextResponse.json(
          { error: `Failed to prepare upload for ${file.fileName}` },
          { status: 500 }
        );
      }

      // Get the public URL for after upload
      const { data: urlData } = supabase.storage
        .from('menu-uploads')
        .getPublicUrl(filePath);

      signedUrls.push({
        fileName: file.fileName,
        fileType: file.fileType,
        uploadUrl: data.signedUrl,
        filePath: filePath,
        publicUrl: urlData.publicUrl,
      });
    }

    return NextResponse.json({ signedUrls }, { status: 200 });
  } catch (error) {
    console.error('Error in upload-temp:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while preparing upload' },
      { status: 500 }
    );
  }
}
