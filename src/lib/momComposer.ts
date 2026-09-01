/**
 * Composer helpers for the MoM point editor.
 *
 * Assignees are structured data, not prose. The editor used to write "@Name"
 * into the point text on selection and then re-derive the assignment list by
 * checking whether that literal string was still present — so rewording a point
 * silently dropped its owner. These helpers keep the two apart: "@" is a
 * shortcut for opening the picker, and the text keeps only what a person typed.
 */

/** Opened from a toolbar button: there is no typed token to remove. */
export const NO_TAG_TOKEN = -1;

export interface TagStripResult {
    /** The text with the token removed (or unchanged). */
    text: string;
    /** Where the caret should sit afterwards. */
    caret: number;
}

/**
 * Remove the `@foo` / `#foo` / `^foo` token that opened the picker.
 *
 * @param text    the current contents of the editor
 * @param anchor  caret position when the picker opened, or NO_TAG_TOKEN
 */
export function stripTagToken(text: string, anchor: number): TagStripResult {
    if (anchor < 0) return { text, caret: text.length };

    const caret = Math.min(Math.max(anchor, 0), text.length);
    const before = text.slice(0, caret).replace(/[@#^]\S*$/, '');
    return { text: before + text.slice(caret), caret: before.length };
}

/**
 * The query being typed after a trigger character, or null when the caret is
 * not inside a tag token.
 */
export function readTagToken(
    text: string,
    caret: number
): { trigger: '@' | '#' | '^'; query: string; start: number } | null {
    if (caret <= 0) return null;
    const before = text.slice(0, caret);
    const match = before.match(/([@#^])(\S*)$/);
    if (!match) return null;
    return {
        trigger: match[1] as '@' | '#' | '^',
        query: match[2],
        start: caret - match[0].length,
    };
}

export interface Assignee {
    id: number | string;
    type: 'employee' | 'department';
    name: string;
}

/** Add an assignee if they are not already on the point. Never duplicates. */
export function addAssignee(list: Assignee[], next: Assignee): Assignee[] {
    return list.some(a => String(a.id) === String(next.id) && a.type === next.type)
        ? list
        : [...list, next];
}

/** Remove one assignee by identity rather than by array index. */
export function removeAssignee(list: Assignee[], target: Pick<Assignee, 'id' | 'type'>): Assignee[] {
    return list.filter(a => !(String(a.id) === String(target.id) && a.type === target.type));
}
