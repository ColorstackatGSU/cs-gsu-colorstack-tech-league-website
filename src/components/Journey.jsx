import { Check, LockSimple } from '@phosphor-icons/react';
import './journey.css';

/**
 * The member's four stages as one line: done, where they are now, what comes next, and
 * what stays locked until something happens. Each state is told apart by shape as well as
 * colour (check, ring, number, padlock), and in words for screen readers.
 */
export function Timeline({ stages, tone }) {
  return (
    <ol className={`journey tone--${tone}`}>
      {stages.map((stage, i) => (
        <li key={stage.id} className={`journey__stage is-${stage.state}`} aria-current={stage.state === 'current' ? 'step' : undefined}>
          <span className="journey__marker" aria-hidden="true">
            {stage.state === 'done' ? (
              <Check size={16} weight="bold" />
            ) : stage.state === 'locked' ? (
              <LockSimple size={15} weight="bold" />
            ) : (
              i + 1
            )}
          </span>
          <span className="journey__text">
            <span className="journey__title">
              {stage.title}
              <span className="sr-only">
                {' '}
                ({stage.state === 'current' ? 'you are here' : stage.state})
              </span>
            </span>
            <span className="journey__note">{stage.note}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function StatusPill({ tone, children, icon: Icon }) {
  return (
    <span className={`status-pill tone--${tone}`}>
      {Icon ? <Icon size={14} weight="fill" aria-hidden="true" /> : <span className="status-pill__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
