import { NextRequest, NextResponse } from 'next/server';
import { getSuiteCRMClient } from '@/lib/suitecrm-service';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const crm = getSuiteCRMClient();
    const documents = await crm.getContactDocuments(params.id);

    return NextResponse.json({ success: true, data: documents });
  } catch (error: any) {
    console.error('[SuiteCRM] Contact documents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, documentUrl, documentName } = body;

    if (!documentId || !documentUrl || !documentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const crm = getSuiteCRMClient();
    const linkId = await crm.linkSeadDocument(
      params.id,
      documentId,
      documentUrl,
      documentName
    );

    return NextResponse.json({ success: true, linkId });
  } catch (error: any) {
    console.error('[SuiteCRM] Link document error:', error);
    return NextResponse.json(
      { error: 'Failed to link document', details: error.message },
      { status: 500 }
    );
  }
}
