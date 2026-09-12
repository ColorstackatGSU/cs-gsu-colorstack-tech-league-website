import { initialsOf } from '../lib/authStore';

/** A member's picture, or their initials when there is none. */
export default function Avatar({ member }) {
  if (member?.picture) {
    return <img className="teammate__avatar" src={member.picture} alt="" />;
  }
  return (
    <span className="teammate__avatar teammate__avatar--initials" aria-hidden="true">
      {initialsOf(member?.name ?? '')}
    </span>
  );
}
