import type { BlockType, TemplateBlock } from '../../types/documents.dto';

export const BLOCK_LABEL: Record<BlockType, string> = {
  letterhead: 'Letterhead',
  title: 'Title',
  meta: 'Reference & date',
  text: 'Text',
  table: 'Table',
  signatures: 'Signatures',
  acceptance: 'Acceptance',
  spacer: 'Space',
  page_break: 'Page break',
  footer_note: 'Small note',
};

export const BLOCK_HINT: Record<BlockType, string> = {
  letterhead: 'Logo, company name and address of the candidate’s company.',
  title: 'The letter’s heading.',
  meta: 'Reference number on the left, letter date on the right.',
  text: 'Paragraphs with **bold**, *italic*, "- " bullets and "1. " numbered points.',
  table: 'Label and value rows, e.g. the terms of the offer.',
  signatures: 'Up to three signatures, with the company stamp.',
  acceptance: 'Lines for the candidate to sign and date.',
  spacer: 'Empty space.',
  page_break: 'Starts a new page.',
  footer_note: 'Small grey text, e.g. a disclaimer.',
};

const id = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: BlockType): TemplateBlock {
  switch (type) {
    case 'letterhead': return { id: id(), type, showLogo: true, showAddress: true };
    case 'title': return { id: id(), type, text: 'Letter title', align: 'left' };
    case 'meta': return { id: id(), type, showReference: true, showDate: true };
    case 'text': return { id: id(), type, text: 'Dear {{candidate.first_name}},' };
    case 'footer_note': return { id: id(), type, text: 'This is a computer-generated letter.' };
    case 'table': return { id: id(), type, heading: '', rows: [{ label: 'Designation', value: '{{offer.designation}}' }] };
    case 'signatures': return { id: id(), type, closing: 'For **{{company.name}}**', slots: [{ label: 'Authorised signatory', signatoryId: null, showStamp: true }] };
    case 'acceptance': return { id: id(), type, text: '' };
    case 'spacer': return { id: id(), type, size: 'md' };
    case 'page_break': return { id: id(), type };
    default: return { id: id(), type: 'text', text: '' };
  }
}

/** A short line describing the block in the collapsed list. */
export function summary(b: TemplateBlock): string {
  switch (b.type) {
    case 'title': return b.text;
    case 'text': case 'footer_note': return b.text.replace(/\s+/g, ' ').slice(0, 80);
    case 'table': return `${b.rows.length} row${b.rows.length === 1 ? '' : 's'}${b.heading ? ` · ${b.heading}` : ''}`;
    case 'signatures': return `${b.slots.length} signature${b.slots.length === 1 ? '' : 's'}`;
    case 'spacer': return { sm: 'Small', md: 'Medium', lg: 'Large' }[b.size];
    default: return '';
  }
}
