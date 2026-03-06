import { NextRequest, NextResponse } from 'next/server';
import { getOrangeHRMClient } from '@/lib/orangehrm-service';
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

    const empNumber = parseInt(params.id);
    const hrm = getOrangeHRMClient();
    const documents = await hrm.getEmployeeDocuments(empNumber);

    return NextResponse.json({ success: true, data: documents });
  } catch (error: any) {
    console.error('[OrangeHRM] Employee documents error:', error);
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

    const empNumber = parseInt(params.id);
    const body = await request.json();
    const { documentId, documentUrl, documentName, documentType } = body;

    if (!documentId || !documentUrl || !documentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const hrm = getOrangeHRMClient();
    const linkId = await hrm.linkSeadDocument(
      empNumber,
      documentId,
      documentUrl,
      documentName,
      documentType
    );

    return NextResponse.json({ success: true, linkId });
  } catch (error: any) {
    console.error('[OrangeHRM] Link document error:', error);
    return NextResponse.json(
      { error: 'Failed to link document', details: error.message },
      { status: 500 }
    );
  }
}
