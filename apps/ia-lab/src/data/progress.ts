const PROGRESS_KEY = "ialab:progress";
const CODE_KEY_PREFIX = "ialab:code:";

export interface ProgressData {
  completedLessonIds: string[];
}

function readProgress(): ProgressData {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return { completedLessonIds: [] };
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "completedLessonIds" in parsed &&
      Array.isArray(parsed.completedLessonIds)
    ) {
      return {
        completedLessonIds: parsed.completedLessonIds.filter(
          (id): id is string => typeof id === "string",
        ),
      };
    }
  } catch {
    return { completedLessonIds: [] };
  }
  return { completedLessonIds: [] };
}

function writeProgress(progress: ProgressData) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  window.dispatchEvent(new Event("ialab:progress-change"));
}

export function getProgress(): ProgressData {
  return readProgress();
}

export function isLessonCompleted(lessonId: string): boolean {
  return readProgress().completedLessonIds.includes(lessonId);
}

export function completeLesson(lessonId: string): void {
  const progress = readProgress();
  if (!progress.completedLessonIds.includes(lessonId)) {
    progress.completedLessonIds.push(lessonId);
    writeProgress(progress);
  }
}

export function saveLessonCode(lessonId: string, code: string): void {
  try {
    localStorage.setItem(`${CODE_KEY_PREFIX}${lessonId}`, code);
  } catch {
    return;
  }
}

export function getLessonCode(lessonId: string, fallback: string): string {
  try {
    return localStorage.getItem(`${CODE_KEY_PREFIX}${lessonId}`) ?? fallback;
  } catch {
    return fallback;
  }
}

export function resetProgress(): void {
  const codeKeys = Object.keys(localStorage).filter((key) =>
    key.startsWith(CODE_KEY_PREFIX),
  );
  codeKeys.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(PROGRESS_KEY);
  window.dispatchEvent(new Event("ialab:progress-change"));
}
