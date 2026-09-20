import { forwardRef, useState, useId } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeSlash, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import './ui.css';

/* ============================================================
   Panel, the core material: a raised silver surface with
   period-correct bevels. Pass `title` to give it window chrome
   (title bar + decorative minimize/maximize/close buttons).

   Exported as both Panel and GlassCard: the name GlassCard is
   kept so existing call sites keep working after the vintage
   redesign.
   ============================================================ */

export function Panel({
  children,
  className = '',
  interactive = false,
  title,
  sunken = false,
  as: Tag = 'div',
  ...rest
}) {
  const hasChrome = Boolean(title);

  return (
    <Tag
      className={['window', sunken ? 'panel-sunken' : 'panel-raised',
        interactive ? 'panel--interactive' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {hasChrome && (
        <div className="window__bar">
          <span className="window__title">{title}</span>
          <span className="window__controls" aria-hidden="true">
            <span className="window__dot">_</span>
            <span className="window__dot">□</span>
            <span className="window__dot">×</span>
          </span>
        </div>
      )}
      {/* The body wrapper always renders so cards keep consistent padding
          and layout whether or not they have a title. */}
      <div className="window__body">{children}</div>
    </Tag>
  );
}

export const GlassCard = Panel;

/* ============================================================
   Button
   ============================================================ */

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    iconRight: IconRight,
    className = '',
    disabled,
    type = 'button',
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <CircleNotch size={18} weight="bold" className="btn__spinner" aria-hidden="true" />
      ) : (
        Icon && <Icon size={18} weight="bold" aria-hidden="true" />
      )}
      <span>{children}</span>
      {IconRight && !loading && (
        <IconRight size={18} weight="bold" aria-hidden="true" className="btn__icon-right" />
      )}
    </button>
  );
});

/* ============================================================
   Field, label + control + helper/error, wired for a11y.
   Errors sit next to the field and are announced.
   ============================================================ */

export function Field({
  label,
  error,
  helper,
  required,
  children,
  htmlFor,
  className = '',
}) {
  const helperId = `${htmlFor}-helper`;
  const errorId = `${htmlFor}-error`;

  return (
    <div className={`field ${error ? 'field--invalid' : ''} ${className}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      {children({ helperId, errorId })}

      {error ? (
        <p className="field__error" id={errorId} role="alert">
          <WarningCircle size={15} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : (
        helper && (
          <p className="field__helper" id={helperId}>
            {helper}
          </p>
        )
      )}
    </div>
  );
}

/* ============================================================
   Inputs
   ============================================================ */

export const TextInput = forwardRef(function TextInput(
  { className = '', invalid, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`input ${invalid ? 'input--invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export const TextArea = forwardRef(function TextArea(
  { className = '', invalid, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`input input--area ${invalid ? 'input--invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select(
  { className = '', invalid, children, ...rest },
  ref
) {
  return (
    <div className="select-wrap">
      <select
        ref={ref}
        className={`input input--select ${invalid ? 'input--invalid' : ''} ${className}`}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
      <span className="select-wrap__chevron" aria-hidden="true">
        <svg viewBox="0 0 16 10" width="16" height="10" fill="none">
          <path
            d="M2 2.5 L8 8 L14 2.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        </svg>
      </span>
    </div>
  );
});

/** Password field with a show/hide toggle. Paste is never blocked. */
export const PasswordInput = forwardRef(function PasswordInput(
  { className = '', invalid, ...rest },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-wrap">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`input input--password ${invalid ? 'input--invalid' : ''} ${className}`}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <button
        type="button"
        className="password-wrap__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={0}
      >
        {visible ? (
          <EyeSlash size={19} weight="regular" aria-hidden="true" />
        ) : (
          <Eye size={19} weight="regular" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});

/* ============================================================
   Misc
   ============================================================ */

export function Badge({ children, tone = 'brand', className = '', icon: Icon }) {
  return (
    <span className={`badge badge--${tone} ${className}`}>
      {Icon && <Icon size={14} weight="fill" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'center', id }) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      {eyebrow && <span className="section-heading__eyebrow">{eyebrow}</span>}
      <h2 className="section-heading__title" id={id}>
        {title}
      </h2>
      {subtitle && <p className="section-heading__subtitle">{subtitle}</p>}
    </div>
  );
}

/** Announced to screen readers; used for save/submit confirmation. */
export function StatusMessage({ tone = 'success', children }) {
  if (!children) return null;
  return (
    <p className={`status-msg status-msg--${tone}`} role="status">
      {children}
    </p>
  );
}

/** Error summary shown at the top of a failed form submit. */
export function ErrorSummary({ errors, onJump, headingRef }) {
  const id = useId();
  const entries = Object.entries(errors ?? {}).filter(([, v]) => Boolean(v));
  if (entries.length === 0) return null;

  return (
    <motion.div
      className="error-summary"
      role="alert"
      tabIndex={-1}
      ref={headingRef}
      aria-labelledby={id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className="error-summary__title" id={id}>
        <WarningCircle size={17} weight="fill" aria-hidden="true" />
        Please fix {entries.length} {entries.length === 1 ? 'field' : 'fields'} before
        continuing
      </p>
      <ul className="error-summary__list">
        {entries.map(([field, message]) => (
          <li key={field}>
            <button type="button" onClick={() => onJump?.(field)}>
              {message}
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
