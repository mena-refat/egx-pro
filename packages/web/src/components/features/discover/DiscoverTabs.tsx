import React from 'react';
import { Tab } from './types';
import styles from '../../../pages/DiscoverPage.module.scss';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ElementType;
  count?: number;
}

interface DiscoverTabsProps {
  tabs: TabDef[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function DiscoverTabs({ tabs, activeTab, onTabChange }: DiscoverTabsProps) {
  return (
    <div className={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <tab.icon className={styles.tabIcon} aria-hidden />
          <span>{tab.label}</span>
          {tab.count != null && tab.count > 0 && (
            <span className={styles.tabBadge}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
