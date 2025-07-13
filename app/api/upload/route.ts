import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate number of files (limit to 5 images per message)
    if (files.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 images allowed per message" },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Only image files are allowed" },
          { status: 400 }
        );
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 5MB` },
          { status: 400 }
        );
      }

      // Validate file name
      if (!file.name || file.name.trim().length === 0) {
        return NextResponse.json(
          { error: "File must have a valid name" },
          { status: 400 }
        );
      }

      try {
        // For now, we'll use a simple base64 encoding approach
        // In production, you'd want to use a proper file storage service like AWS S3, Cloudinary, etc.
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:${file.type};base64,${base64}`;

        uploadedFiles.push({
          type: "image",
          url: dataUrl,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        return NextResponse.json(
          { error: `Failed to process file ${file.name}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
} 