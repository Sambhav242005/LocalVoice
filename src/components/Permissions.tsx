import React, { useEffect, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform } from 'react-native';
import { Button, Panel, Txt } from './ui';
import { useStore } from '../core/store';

export function Permissions() {
  const { setNotice } = useStore();
  const [status, setStatus] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const permissions = { Microphone: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, Notifications: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS };
  useEffect(() => {
    const refresh = async () => {
      if (Platform.OS !== 'android') return;
      for (const [name, permission] of Object.entries(permissions)) {
        const granted = name === 'Notifications' && Number(Platform.Version) < 33 || await PermissionsAndroid.check(permission);
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
    setBusy(true);
    try {
      const result = await PermissionsAndroid.request(permissions[name]);
      setStatus(old => ({ ...old, [name]: result === 'granted' ? 'Allowed' : result === 'never_ask_again' ? 'Blocked — enable in device settings' : 'Denied' }));
    } catch { setNotice('Permission request failed. Rebuild the Android app with the new permission configuration.', 'error'); }
    finally { setBusy(false); }
  };
  return <Panel>
    <Txt>Microphone access is for the future voice conversation feature. Notifications are for future incoming-call alerts. Granting either does not enable real call takeover.</Txt>
    {Platform.OS !== 'android' ? <Txt>Permission setup is available in the Android app.</Txt> : <>
      {Object.keys(permissions).map(name => <React.Fragment key={name}><Txt>{name}: {status[name] ?? 'Checking…'}</Txt><Button label={`Allow ${name.toLowerCase()}`} secondary disabled={busy || status[name] === 'Allowed'} onPress={() => { void request(name as keyof typeof permissions); }} /></React.Fragment>)}
      <Button label="Open device permission settings" secondary onPress={() => { void Linking.openSettings().catch(() => setNotice('Could not open device settings.', 'error')); }} />
    </>}
    <Txt kind="small">Real calls: VoIP connection and audio pipeline pending. No access to contacts or SIM call logs is requested.</Txt>
  </Panel>;
}
