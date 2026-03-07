import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Company from '../../../models/Company';

/**
 * GET /api/companies - List all active companies
 */
export async function GET() {
  try {
    await connectDB();

    const companies = await Company.find({ isActive: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      companies,
      count: companies.length,
    });
  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch companies',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
