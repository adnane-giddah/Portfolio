import type { Toast } from '../hooks/useToasts';

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div id="toastRail">
      {toasts.map((t) => (
        <div key={t.id} className={'toast' + (t.out ? ' out' : '')}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
