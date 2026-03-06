import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Request from '@/models/Request';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { type, externalId, externalUrl } = body;

    if (!type || !externalId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Try to find by _id first, then by requestId
    const req = await Request.findById(params.id) || await Request.findOne({ requestId: params.id });
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Add integration link
    if (!req.integrationLinks) {
      req.integrationLinks = [];
    }

    req.integrationLinks.push({
      type,
      externalId,
      externalUrl,
      linkedAt: new Date(),
      linkedBy: user._id,
    });

    await req.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully linked to external system' 
    });
  } catch (error: any) {
    console.error('[LINK] Error:', error);
    return NextResponse.json(
      { error: 'Failed to link request', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Try to find by _id first, then by requestId
    const req = await Request.findById(params.id) || await Request.findOne({ requestId: params.id });
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Populate the linkedBy user
    await req.populate('integrationLinks.linkedBy', 'name email');

    return NextResponse.json({ 
      success: true, 
      links: req.integrationLinks || [] 
    });
  } catch (error: any) {
    console.error('[LINK] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch links', details: error.message },
      { status: 500 }
    );
  }
}
