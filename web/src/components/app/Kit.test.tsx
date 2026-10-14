import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Eye, Flag } from 'lucide-react';
import { OverflowMenu, SegmentedTabs } from './Kit';

function Tabs() {
  const [value, setValue] = useState<'a' | 'b' | 'c'>('a');
  return (
    <>
      <SegmentedTabs
        panelId="p"
        label="Deneme"
        value={value}
        onChange={setValue}
        options={[
          { value: 'a', label: 'Bir' },
          { value: 'b', label: 'İki' },
          { value: 'c', label: 'Üç' },
        ]}
      />
      <div role="tabpanel" id="p" aria-labelledby={`p-tab-${value}`}>
        içerik {value}
      </div>
    </>
  );
}

describe('SegmentedTabs', () => {
  it('ok tuşları sekmeler arasında gezer, yalnızca seçili sekme Tab ile erişilir', async () => {
    const user = userEvent.setup();
    render(<Tabs />);
    const [one, two, three] = screen.getAllByRole('tab');
    expect(one).toHaveAttribute('tabindex', '0');
    expect(two).toHaveAttribute('tabindex', '-1');
    one.focus();
    await user.keyboard('{ArrowRight}');
    expect(two).toHaveFocus();
    expect(two).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(three).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(one).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(three).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Üç');
  });
});

describe('OverflowMenu', () => {
  const setup = () => {
    const onClick = vi.fn();
    render(
      <OverflowMenu
        label="Diğer"
        items={[
          { label: 'Bir', icon: Eye, onClick },
          { label: 'İki', icon: Flag, onClick: () => undefined, disabled: true },
          { label: 'Üç', icon: Flag, onClick: () => undefined },
        ]}
      />,
    );
    return { onClick, trigger: screen.getByRole('button', { name: 'Diğer' }) };
  };

  it('açılınca ilk öğeye odaklanır, oklar etkin öğeler arasında gezer', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Bir' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Üç' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Bir' })).toHaveFocus();
  });

  it('Esc menüyü kapatır ve odak düğmeye döner', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('öğe seçilince eylem çalışır ve odak düğmeye döner; ArrowDown menüyü açar', async () => {
    const user = userEvent.setup();
    const { trigger, onClick } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
