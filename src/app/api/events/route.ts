import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEvents = await db
      .select()
      .from(events)
      .where(eq(events.userId, session.user.id));

    return NextResponse.json(userEvents);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await _request.json();
    const newEvent = await db
      .insert(events)
      .values({
        ...body,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json(newEvent[0], { status: 201 });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function PATCH(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await _request.json();
    const { id, ...updates } = body;

    const updatedEvent = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(events.id, id), eq(events.userId, session.user.id)))
      .returning();

    if (!updatedEvent.length) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(updatedEvent[0]);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(_request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    await db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
