export async function api(path, options = {}) {
  const response = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options.headers },
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Máy chủ chưa phản hồi. Vui lòng thử lại.");
  }
  if (!response.ok) {
    const e = new Error(data.error || "Có lỗi xảy ra.");
    e.status = response.status;
    throw e;
  }
  return data;
}
export const dateLabel = (d, options = {}) =>
  new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    ...options,
  });
export const fullDate = (d) =>
  new Date(d).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
export const initials = (name) =>
  name
    .split(" ")
    .slice(-2)
    .map((x) => x[0])
    .join("");
export function csvDownload(rows, name) {
  const text =
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v ?? "")
                .replace(/^[=+\-@\t\r]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8;" }),
  );
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Send one MiB at a time to stay below Vercel's request limit.
export async function uploadPdf(file) {
  const { id } = await api("/uploads", {
    method: "POST",
    body: { name: file.name, size: file.size },
  });
  try {
    for (
      let offset = 0, part = 0;
      offset < file.size;
      offset += 1024 * 1024, part++
    ) {
      const blob = file.slice(offset, offset + 1024 * 1024);
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Không đọc được tệp PDF."));
        reader.readAsDataURL(blob);
      });
      await api(`/uploads/${id}/${part}`, { method: "PUT", body: { data } });
    }
    return await api("/import", { method: "POST", body: { uploadId: id } });
  } catch (e) {
    await api(`/uploads/${id}`, { method: "DELETE" }).catch(() => {});
    throw e;
  }
}
