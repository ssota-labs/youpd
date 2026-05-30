'use client';

import { useCallback, useMemo, useState } from 'react';

import type { TableOfContentsItem } from './types';

/**
 * Generic TOC controller hook. Maps domain items to UI items, bridges active/click
 * handlers, and manages hover state. Use in summary/timeline tabs.
 */
export interface UseTableOfContentsControllerParams<T> {
  /** Domain items (headings, minute buckets, etc.) */
  items: T[];
  /** Map domain item to TableOfContentsItem (id must be stable per item) */
  mapToUiItem: (item: T) => TableOfContentsItem;
  /** Returns true if the domain item is currently active */
  getIsDomainItemActive: (item: T) => boolean;
  /** Called when user clicks a TOC entry */
  onDomainItemClick: (item: T) => void;
  /** If set, compactItems = items.slice(0, limit) for line-rail display */
  compactLimit?: number;
}

export interface UseTableOfContentsControllerResult {
  /** Full list of UI items */
  allItems: TableOfContentsItem[];
  /** For lines rail: compactLimit ? allItems.slice(0, limit) : allItems */
  compactItems: TableOfContentsItem[];
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  getIsActive: (item: TableOfContentsItem) => boolean;
  onItemClick: (item: TableOfContentsItem) => void;
}

export function useTableOfContentsController<T>({
  items,
  mapToUiItem,
  getIsDomainItemActive,
  onDomainItemClick,
  compactLimit,
}: UseTableOfContentsControllerParams<T>): UseTableOfContentsControllerResult {
  const [isHovered, setIsHovered] = useState(false);

  const idToDomain = useMemo(
    () => new Map(items.map((i) => [mapToUiItem(i).id, i])),
    [items, mapToUiItem]
  );

  const allItems = useMemo(() => items.map(mapToUiItem), [items, mapToUiItem]);

  const compactItems = useMemo(
    () => (compactLimit != null ? allItems.slice(0, compactLimit) : allItems),
    [allItems, compactLimit]
  );

  const getIsActive = useCallback(
    (item: TableOfContentsItem) => {
      const domain = idToDomain.get(item.id);
      return domain ? getIsDomainItemActive(domain) : false;
    },
    [idToDomain, getIsDomainItemActive]
  );

  const onItemClick = useCallback(
    (item: TableOfContentsItem) => {
      const domain = idToDomain.get(item.id);
      if (domain) onDomainItemClick(domain);
    },
    [idToDomain, onDomainItemClick]
  );

  const onMouseEnter = useCallback(() => setIsHovered(true), []);
  const onMouseLeave = useCallback(() => setIsHovered(false), []);

  return {
    allItems,
    compactItems,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    getIsActive,
    onItemClick,
  };
}
