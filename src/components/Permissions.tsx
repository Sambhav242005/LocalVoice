import React, { useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform } from 'react-native';
import { Button, Panel, Txt } from './ui';
import { useStore } from '../core/store';

export function Permissions() {
  const { setNotice } = useStore();
  const [status, setStatus] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const permissions = { Microphone: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, Notifications: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, Bluetooth: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT };
  const needsPrompt = (name: string) => !(name === 'Notifications' && Number(Platform.Version) < 33 || name === 'Bluetooth' && Number(Platform.Version) < 31);
  useEffect(() => {
    const refresh = async () => {
      if (Platform.OS !== 'android') return;
      for (const [name, permission] of Object.entries(permissions)) {
        if (!needsPrompt(name)) {
          setStatus(old => ({ ...old, [name]: 'No runtime prompt on this Android version' }));
          continue;
        }
        const granted = await PermissionsAndroid.check(permission);
        setStatus(old => ({ ...old, [name]: granted ? 'Allowed' : 'Not allowed' }));
      }
    };
    void refresh().catch(() => setNotice('Could not check Android permissions.', 'error'));
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh().catch(() => {}); });
    return () => listener.remove();
    // Permission constants are fixed; refresh after returning from device settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNotice]);
  const request = async (name: keyof typeof permissions) => {
    if (!needsPrompt(name)) return;
    setBusy(true);
    try {
      const result = await PermissionsAndroid.request(permissions[name]);
      setStatus(old => ({ ...old, [name]: result === 'granted' ? 'Allowed' : result === 'never_ask_again' ? 'Blocked — enable in device settings' : 'Denied' }));
    } catch { setNotice('Permission request failed. Rebuild the Android app with the new permission configuration.', 'error'); }
    finally { setBusy(false); }
  };
  return <Panel>
    <Txt>Microphone access is for voice input. Notifications are for call alerts. Bluetooth access allows communication with already-paired devices for the planned external audio bridge. These integrations are still in development.</Txt>
    {Platform.OS !== 'android' ? <Txt>Permission setup is available in the Android app.</Txt> : <>
      {Object.keys(permissions).map(name => <React.Fragment key={name}><Txt>{name}: {status[name] ?? 'Checking…'}</Txt><Button label={`Allow ${name.toLowerCase()}`} secondary disabled={busy || !needsPrompt(name) || status[name] === 'Allowed'} onPress={() => { void request(name as keyof typeof permissions); }} /></React.Fragment>)}
      <Button label="Open device permission settings" secondary onPress={() => { void Linking.openSettings().catch(() => setNotice('Could not open device settings.', 'error')); }} />
    </>}
    <Txt kind="small">SIM call audio access and virtual headsets require system integration. Android cannot show an Allow popup for protected audio capture or routing permissions. Bluetooth approval does not unlock them. No access to contacts or SIM call logs is requested.</Txt>
  </Panel>;
}
