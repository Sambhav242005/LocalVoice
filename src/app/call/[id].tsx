import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../core/store';
import { Conversation } from '../../components/Conversation';
import { Button, Panel, Screen, Txt } from '../../components/ui';
export default function CallDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { calls } = useStore();
  const call = calls.find(item => item.id === id);
  return <Screen title="Call detail" subtitle="Transcript, outcome and settings for this conversation."><Button label="Back to calls" secondary icon="arrow-back" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/calls'); }} />{call ? <Conversation call={call} /> : <Panel><Txt>This call could not be found.</Txt></Panel>}</Screen>;
}
