import { NextResponse } from "next/server";
import { updateReviewRows } from "../../../../../../../lib/services";

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string; jobId: string }> },
) {
  try {
    const { businessId, jobId } = await context.params;
    const patch = await request.json();
    await updateReviewRows({ businessId, jobId, patch });
    return NextResponse.json({ message: "Review changes saved." });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save review changes.",
      },
      { status: 400 },
    );
  }
}

