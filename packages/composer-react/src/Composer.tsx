'use client';

import type { Composition, ProfileSpec } from '@youpd/composer-core';
import { ComposerCanvas } from './Canvas/Stage';
import { Toolbar } from './panels/Toolbar';
import { LayerPanel } from './panels/LayerPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { ComposerProvider } from './store/context';
import type { ServerActions } from './adapters/server-actions';

export type ComposerProps = {
  documentId: string;
  version: number;
  document: Composition;
  profile: ProfileSpec;
  actions: ServerActions;
  fontManifestUrl: string;
  orgId: string;
  // Optional header label rendered above the toolbar; profile-specific
  // labelling stays out of the package.
  header?: React.ReactNode;
  realtime?: {
    url: string;
    anonKey: string;
    channelPrefix?: string;
  };
};

// Top-level Composer that wires the store + adapters + 3-col layout. Hosts
// mount this inside their own page after dynamically importing it with
// ssr:false (Konva imports DOM-only modules at parse time).
export function Composer(props: ComposerProps) {
  return (
    <ComposerProvider
      actions={props.actions}
      profile={props.profile}
      fontManifestUrl={props.fontManifestUrl}
      orgId={props.orgId}
    >
      <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
        {props.header ? (
          <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
            {props.header}
          </header>
        ) : null}
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <LayerPanel />
          <main className="flex-1 overflow-auto flex items-center justify-center p-4">
            <ComposerCanvas
              documentId={props.documentId}
              initialVersion={props.version}
              initialDocument={props.document}
              realtime={props.realtime}
              reservedHorizontalPx={560}
            />
          </main>
          <PropertiesPanel />
        </div>
      </div>
    </ComposerProvider>
  );
}
