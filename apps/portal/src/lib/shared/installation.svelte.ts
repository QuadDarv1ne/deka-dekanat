export interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export const installation = $state<{ event: InstallEvent | null; installed: boolean }>({
  event: null,
  installed: false
});
