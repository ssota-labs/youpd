> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# File uploads

> Upload local files or import external files into Notion from the terminal.

Use `ntn files` when you want to create a Notion [File Upload](/reference/file-upload) from your terminal. The command handles the upload lifecycle for local files: it creates the File Upload object, sends the file bytes, completes the upload, and prints the resulting upload ID.

After the upload has a status of `uploaded`, use its ID in a [`file_upload` file object](/reference/block#file) to attach it to a page, block, page icon, page cover, or files property.

## Upload a local file

Redirect the file into `ntn files create`:

```bash theme={null}
ntn files create < ./photo.png
```

By default, the command prints a human-readable summary:

```text theme={null}
ID             43833259-72ae-404e-8441-b6577f3159b4
Filename       photo.png
Status         uploaded
Content type   image/png
Content length 245891
Created time   2026-05-11T20:12:00.000Z
Last edited    2026-05-11T20:12:02.000Z
Expiry time    2026-05-11T21:12:00.000Z
```

For scripts, use `--plain` to return tab-separated fields with the upload ID first:

```bash theme={null}
FILE_UPLOAD_ID=$(ntn files create --plain < ./photo.png | cut -f1)
```

Use `--json` when you want the full File Upload object:

```bash theme={null}
ntn files create --json < ./photo.png
```

`ntn files create` reads bytes from stdin. If you run it without redirecting a file, the command exits with a hint to pass a file with shell redirection.

## Set the filename or content type

The CLI infers the filename and MIME type when it can. Override either value when stdin does not preserve enough information, or when you are generating file bytes from another command:

```bash theme={null}
generate-report --format pdf \
  | ntn files create \
      --filename weekly-report.pdf \
      --content-type application/pdf
```

Use `--filename` when the uploaded file should have a specific name in Notion. Use `--content-type` when the file extension is missing or the inferred MIME type would be ambiguous.

## Import a file from a URL

Use `--external-url` when the file is already hosted at a public HTTPS URL:

```bash theme={null}
FILE_UPLOAD_ID=$(ntn files create --plain \
  --external-url https://example.com/photo.png \
  --filename photo.png \
  | cut -f1)
```

External URL imports are processed asynchronously by Notion. Check the upload status before attaching the file:

```bash theme={null}
ntn files get "$FILE_UPLOAD_ID"
```

Wait until the status is `uploaded`. If the status becomes `failed`, create a new upload after fixing the URL, file type, or file size issue.

## Attach an uploaded file

`ntn files create` uploads the file, but does not choose where to place it in your workspace. Attach the upload by passing the ID to a Notion API endpoint with [`ntn api`](/cli/guides/api-requests).

The examples below use the inline body field syntax described in [API request syntax](/cli/guides/api-requests).

For example, append an image block to a page:

```bash theme={null}
FILE_UPLOAD_ID=$(ntn files create --plain < ./photo.png | cut -f1)

ntn api "v1/blocks/$PAGE_ID/children" -X PATCH \
  children[0][type]=image \
  children[0][image][type]=file_upload \
  children[0][image][file_upload][id]="$FILE_UPLOAD_ID"
```

To attach the upload as a generic file block, change the block type and file field:

```bash theme={null}
FILE_UPLOAD_ID=$(ntn files create --plain < ./contract.pdf | cut -f1)

ntn api "v1/blocks/$PAGE_ID/children" -X PATCH \
  children[0][type]=file \
  children[0][file][type]=file_upload \
  children[0][file][file_upload][id]="$FILE_UPLOAD_ID"
```

To attach the upload to a files property on an existing database page:

```bash theme={null}
FILE_UPLOAD_ID=$(ntn files create --plain < ./contract.pdf | cut -f1)

ntn api "v1/pages/$PAGE_ID" -X PATCH \
  properties[Attachments][files][0][type]=file_upload \
  properties[Attachments][files][0][file_upload][id]="$FILE_UPLOAD_ID" \
  properties[Attachments][files][0][name]=contract.pdf
```

Replace `Attachments` with the name of your files property.

<Note>
  Attach file uploads within one hour. Uploads that are not attached before
  their `expiry_time` can expire and cannot be attached later.
</Note>

## Find an existing upload

List recent file uploads:

```bash theme={null}
ntn files list
```

Retrieve one upload by ID:

```bash theme={null}
ntn files get 43833259-72ae-404e-8441-b6577f3159b4
```

Both commands support `--json` and `--plain` for scripting:

```bash theme={null}
ntn files list --json
ntn files get "$FILE_UPLOAD_ID" --plain
```

`ntn files list` currently returns only the first page. For cursor-based pagination, call the File Uploads API directly:

```bash theme={null}
ntn api v1/file_uploads start_cursor=="$NEXT_CURSOR"
```

## Send a multipart request yourself

Most uploads should use `ntn files create`. Use `ntn api --file` when you need lower-level control over the File Upload API, such as sending one part of an upload that your own script created:

```bash theme={null}
ntn api "v1/file_uploads/$FILE_UPLOAD_ID/send" \
  --file ./chunk.bin \
  part_number=1
```

`--file` sends a multipart form-data request with the file contents in a form field named `file`. Other inline body fields become additional multipart form fields.

## Troubleshooting

| Problem                                        | What to check                                                                                                                     |
| :--------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `ntn files create` says no bytes were received | Redirect a file into stdin, for example `ntn files create < ./photo.png`.                                                         |
| The filename is wrong or missing               | Pass `--filename`. This is useful when piping generated bytes.                                                                    |
| The content type is wrong                      | Pass `--content-type`, such as `image/png` or `application/pdf`.                                                                  |
| An external URL import stays `pending`         | Poll with `ntn files get <upload-id>` until it becomes `uploaded` or `failed`.                                                    |
| A file upload cannot be attached               | Confirm the upload status is `uploaded`, the file type is valid for the target block or property, and the upload has not expired. |
| You need more than the first page of uploads   | Use `ntn api v1/file_uploads` with cursor query parameters.                                                                       |

## Next steps

<CardGroup cols={2}>
  <Card title="API request syntax" icon="https://mintcdn.com/notion-demo/7WdlNb9IZkRhGCcR/icons/nds/terminal.svg?fit=max&auto=format&n=7WdlNb9IZkRhGCcR&q=85&s=ed75fe4bd49b0ec0117eeead6adb4e5d" href="/cli/guides/api-requests" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/terminal.svg">
    Build Notion API requests with `ntn api`.
  </Card>

  <Card title="File Upload reference" icon="https://mintcdn.com/notion-demo/yKfkO8UsVZTLLPNp/icons/nds/arrowTrayUp.svg?fit=max&auto=format&n=yKfkO8UsVZTLLPNp&q=85&s=3b991e18c85512f06c2d7214acf94f12" href="/reference/file-upload" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/arrowTrayUp.svg">
    See File Upload statuses, fields, size limits, and endpoints.
  </Card>
</CardGroup>
