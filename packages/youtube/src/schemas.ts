import { z } from 'zod';

// Normalised, project-owned shapes for the YouTube Data API v3 responses we
// actually consume. The raw API returns a lot more — we only carry what tools
// need. Zod 4 enforces this at every boundary so callers cannot accidentally
// rely on unparsed fields.

export const ThumbnailSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type Thumbnail = z.infer<typeof ThumbnailSchema>;

export const ThumbnailSetSchema = z.object({
  default: ThumbnailSchema.optional(),
  medium: ThumbnailSchema.optional(),
  high: ThumbnailSchema.optional(),
  standard: ThumbnailSchema.optional(),
  maxres: ThumbnailSchema.optional(),
});
export type ThumbnailSet = z.infer<typeof ThumbnailSetSchema>;

/** YouPD short-form rule: under 60 seconds (strictly less than 1 minute). */
export const SHORT_FORM_DURATION_LIMIT_SEC = 60;

export function isShortFromDuration(
  durationSeconds: number | null | undefined,
): boolean | null {
  if (durationSeconds == null) return null;
  return durationSeconds < SHORT_FORM_DURATION_LIMIT_SEC;
}

export const VideoSummarySchema = z.object({
  videoId: z.string(),
  title: z.string(),
  description: z.string(),
  channelId: z.string(),
  channelTitle: z.string(),
  publishedAt: z.string(),
  thumbnails: ThumbnailSetSchema,
  durationSeconds: z.number().int().nonnegative().nullable(),
  isShort: z.boolean().nullable(),
  views: z.number().int().nonnegative().nullable(),
  likes: z.number().int().nonnegative().nullable(),
  comments: z.number().int().nonnegative().nullable(),
  tags: z.array(z.string()),
  categoryId: z.string().nullable(),
  defaultAudioLanguage: z.string().nullable(),
  url: z.string().url(),
});
export type VideoSummary = z.infer<typeof VideoSummarySchema>;

export const ChannelSummarySchema = z.object({
  channelId: z.string(),
  title: z.string(),
  description: z.string(),
  publishedAt: z.string(),
  thumbnails: ThumbnailSetSchema,
  subscriberCount: z.number().int().nonnegative().nullable(),
  videoCount: z.number().int().nonnegative().nullable(),
  viewCount: z.number().int().nonnegative().nullable(),
  hiddenSubscriberCount: z.boolean(),
  uploadsPlaylistId: z.string().nullable(),
  country: z.string().nullable(),
  url: z.string().url(),
});
export type ChannelSummary = z.infer<typeof ChannelSummarySchema>;

export const CommentSummarySchema = z.object({
  commentId: z.string(),
  videoId: z.string(),
  authorDisplayName: z.string(),
  authorChannelId: z.string().nullable(),
  text: z.string(),
  likeCount: z.number().int().nonnegative(),
  totalReplyCount: z.number().int().nonnegative(),
  publishedAt: z.string(),
  updatedAt: z.string(),
});
export type CommentSummary = z.infer<typeof CommentSummarySchema>;

// Raw YouTube response envelopes (only the shape we actually parse out of).
// These are intentionally permissive — we use them to ferry data into the
// normalised summaries above.

export const RawSearchItemSchema = z.object({
  kind: z.string().optional(),
  id: z
    .object({
      kind: z.string().optional(),
      videoId: z.string().optional(),
      channelId: z.string().optional(),
      playlistId: z.string().optional(),
    })
    .optional(),
  snippet: z
    .object({
      publishedAt: z.string().optional(),
      channelId: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      thumbnails: z.record(z.string(), ThumbnailSchema).optional(),
      channelTitle: z.string().optional(),
    })
    .optional(),
});

export const RawVideoSchema = z.object({
  id: z.string(),
  snippet: z
    .object({
      publishedAt: z.string(),
      channelId: z.string(),
      title: z.string(),
      description: z.string().default(''),
      thumbnails: z.record(z.string(), ThumbnailSchema).default({}),
      channelTitle: z.string(),
      tags: z.array(z.string()).default([]),
      categoryId: z.string().optional(),
      defaultAudioLanguage: z.string().optional(),
    })
    .optional(),
  contentDetails: z
    .object({
      duration: z.string().optional(),
    })
    .optional(),
  statistics: z
    .object({
      viewCount: z.string().optional(),
      likeCount: z.string().optional(),
      commentCount: z.string().optional(),
    })
    .optional(),
});
export type RawVideo = z.infer<typeof RawVideoSchema>;

export const RawChannelSchema = z.object({
  id: z.string(),
  snippet: z
    .object({
      title: z.string(),
      description: z.string().default(''),
      publishedAt: z.string(),
      thumbnails: z.record(z.string(), ThumbnailSchema).default({}),
      country: z.string().optional(),
    })
    .optional(),
  statistics: z
    .object({
      viewCount: z.string().optional(),
      subscriberCount: z.string().optional(),
      hiddenSubscriberCount: z.boolean().optional(),
      videoCount: z.string().optional(),
    })
    .optional(),
  contentDetails: z
    .object({
      relatedPlaylists: z
        .object({
          uploads: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});
export type RawChannel = z.infer<typeof RawChannelSchema>;

export const RawCommentThreadSchema = z.object({
  id: z.string(),
  snippet: z.object({
    videoId: z.string(),
    totalReplyCount: z.number().int().nonnegative().default(0),
    topLevelComment: z.object({
      id: z.string(),
      snippet: z.object({
        authorDisplayName: z.string(),
        authorChannelId: z
          .object({ value: z.string().optional() })
          .optional()
          .nullable(),
        textDisplay: z.string().default(''),
        textOriginal: z.string().default(''),
        likeCount: z.number().int().nonnegative().default(0),
        publishedAt: z.string(),
        updatedAt: z.string(),
      }),
    }),
  }),
});
export type RawCommentThread = z.infer<typeof RawCommentThreadSchema>;

// Parse ISO 8601 duration ("PT4M13S") into total seconds. Returns null when
// the format is unrecognised so callers can decide to omit the field.
export function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const [, d, h, m, s] = match;
  const days = d ? Number(d) : 0;
  const hours = h ? Number(h) : 0;
  const mins = m ? Number(m) : 0;
  const secs = s ? Number(s) : 0;
  return days * 86_400 + hours * 3_600 + mins * 60 + secs;
}

function safeNumber(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normaliseVideo(raw: RawVideo): VideoSummary {
  const snippet = raw.snippet ?? {
    publishedAt: '',
    channelId: '',
    title: '',
    description: '',
    thumbnails: {},
    channelTitle: '',
    tags: [],
  };
  const durationSeconds = parseIsoDuration(raw.contentDetails?.duration);
  return VideoSummarySchema.parse({
    videoId: raw.id,
    title: snippet.title ?? '',
    description: snippet.description ?? '',
    channelId: snippet.channelId ?? '',
    channelTitle: snippet.channelTitle ?? '',
    publishedAt: snippet.publishedAt ?? '',
    thumbnails: snippet.thumbnails ?? {},
    durationSeconds,
    isShort: isShortFromDuration(durationSeconds),
    views: safeNumber(raw.statistics?.viewCount),
    likes: safeNumber(raw.statistics?.likeCount),
    comments: safeNumber(raw.statistics?.commentCount),
    tags: snippet.tags ?? [],
    categoryId: snippet.categoryId ?? null,
    defaultAudioLanguage: snippet.defaultAudioLanguage ?? null,
    url: `https://www.youtube.com/watch?v=${raw.id}`,
  });
}

export function normaliseChannel(raw: RawChannel): ChannelSummary {
  const snippet = raw.snippet ?? {
    title: '',
    description: '',
    publishedAt: '',
    thumbnails: {},
  };
  const stats = raw.statistics ?? {};
  return ChannelSummarySchema.parse({
    channelId: raw.id,
    title: snippet.title ?? '',
    description: snippet.description ?? '',
    publishedAt: snippet.publishedAt ?? '',
    thumbnails: snippet.thumbnails ?? {},
    subscriberCount: stats.hiddenSubscriberCount
      ? null
      : safeNumber(stats.subscriberCount),
    videoCount: safeNumber(stats.videoCount),
    viewCount: safeNumber(stats.viewCount),
    hiddenSubscriberCount: stats.hiddenSubscriberCount ?? false,
    uploadsPlaylistId: raw.contentDetails?.relatedPlaylists?.uploads ?? null,
    country: snippet.country ?? null,
    url: `https://www.youtube.com/channel/${raw.id}`,
  });
}

export function normaliseCommentThread(raw: RawCommentThread): CommentSummary {
  const top = raw.snippet.topLevelComment;
  return CommentSummarySchema.parse({
    commentId: top.id,
    videoId: raw.snippet.videoId,
    authorDisplayName: top.snippet.authorDisplayName,
    authorChannelId: top.snippet.authorChannelId?.value ?? null,
    text: top.snippet.textOriginal || top.snippet.textDisplay,
    likeCount: top.snippet.likeCount,
    totalReplyCount: raw.snippet.totalReplyCount,
    publishedAt: top.snippet.publishedAt,
    updatedAt: top.snippet.updatedAt,
  });
}
