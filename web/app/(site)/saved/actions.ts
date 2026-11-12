'use server';
import { cardsByIds } from '@/lib/data';
export async function loadCards(ids: string[]) { return cardsByIds(Array.isArray(ids) ? ids.map(String) : []); }
