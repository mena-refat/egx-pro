import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FollowUser } from './types';
import styles from '../../../pages/DiscoverPage.module.scss';

interface UserListProps {
  users: FollowUser[];
}

export function UserList({ users }: UserListProps) {
  const navigate = useNavigate();
  return (
    <ul className={styles.userList}>
      {users.map((u) => (
        <li key={u.id} className={styles.userItem}>
          <button
            type="button"
            onClick={() => u.username && navigate(`/profile/${u.username}`)}
            className={styles.userButton}
          >
            <div className={styles.userAvatar}>
              {u.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className={styles.avatarImg}
                  loading="lazy"
                />
              ) : (
                <Users
                  style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-muted)' }}
                  aria-hidden
                />
              )}
            </div>
            <div>
              <p className={styles.userName}>{u.fullName ?? `@${u.username}`}</p>
              {u.fullName && u.username && (
                <p className={styles.userHandle}>@{u.username}</p>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
