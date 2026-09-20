// lib/doc-tree.ts

export type DocNodeKind = "folder" | "link";

export interface DocNode {
  id: string;
  parent_id: string | null;
  kind: DocNodeKind;
  title: string;
  url: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocTreeNode extends DocNode {
  children: DocTreeNode[];
  depth: number;
}

/**
 * Compare function for sorting doc nodes:
 * Folders come before links.
 * Each group is sorted alphabetically by title, case-insensitive.
 */
export function compareDocNodes(a: DocNode, b: DocNode): number {
  if (a.kind !== b.kind) {
    return a.kind === "folder" ? -1 : 1;
  }
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

/**
 * Build a hierarchical tree of DocTreeNodes from flat database rows.
 * - Folders before links, alphabetical by title (case-insensitive) at each level.
 * - 1-based depth calculation (root level is 1).
 * - Orphan rows (whose parent_id does not exist in the dataset) are kept as root nodes
 *   so they do not vanish silently.
 */
export function buildDocTree(nodes: DocNode[]): DocTreeNode[] {
  const nodeMap = new Map<string, DocTreeNode>();
  const rawNodeMap = new Set<string>();

  for (const node of nodes) {
    rawNodeMap.add(node.id);
    nodeMap.set(node.id, {
      ...node,
      children: [],
      depth: 1,
    });
  }

  const roots: DocTreeNode[] = [];

  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parent_id === null || !rawNodeMap.has(node.parent_id)) {
      // Top-level node or orphan node
      roots.push(treeNode);
    } else {
      const parent = nodeMap.get(node.parent_id);
      if (parent) {
        parent.children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    }
  }

  function assignDepthsAndSort(nodesList: DocTreeNode[], currentDepth: number) {
    nodesList.sort(compareDocNodes);
    for (const node of nodesList) {
      node.depth = currentDepth;
      if (node.children.length > 0) {
        assignDepthsAndSort(node.children, currentDepth + 1);
      }
    }
  }

  assignDepthsAndSort(roots, 1);
  return roots;
}

/**
 * Recursively count the total number of folders and links in a node's subtree.
 */
export function countDescendants(node: DocTreeNode): { folders: number; links: number } {
  let folders = 0;
  let links = 0;

  for (const child of node.children) {
    if (child.kind === "folder") {
      folders += 1;
    } else {
      links += 1;
    }
    const childCounts = countDescendants(child);
    folders += childCounts.folders;
    links += childCounts.links;
  }

  return { folders, links };
}

/**
 * Format delete confirmation message according to spec:
 * - Link: `Delete "Work Order 2024-25"?`
 * - Empty folder: `Delete "Drawings"?`
 * - Folder with contents: `Delete "Drawings" and everything inside it? 2 folders and 9 links.`
 */
export function getDeleteConfirmMessage(node: DocTreeNode): string {
  if (node.kind === "link") {
    return `Delete "${node.title}"?`;
  }

  const { folders, links } = countDescendants(node);
  if (folders === 0 && links === 0) {
    return `Delete "${node.title}"?`;
  }

  const parts: string[] = [];
  if (folders > 0) {
    parts.push(`${folders} ${folders === 1 ? "folder" : "folders"}`);
  }
  if (links > 0) {
    parts.push(`${links} ${links === 1 ? "link" : "links"}`);
  }

  return `Delete "${node.title}" and everything inside it? ${parts.join(" and ")}.`;
}

/**
 * Compute the depth of a new node with given parentId using an existing lookup map.
 * Returns 1 for root, or parentDepth + 1.
 */
export function computeNodeDepth(
  parentId: string | null,
  nodeMap: Map<string, { id: string; parent_id: string | null }>
): number {
  let depth = 1;
  let currentParentId = parentId;

  while (currentParentId) {
    depth += 1;
    const parent = nodeMap.get(currentParentId);
    if (!parent) break;
    currentParentId = parent.parent_id;
  }

  return depth;
}
