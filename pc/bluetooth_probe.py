"""Virtual HFP headset for emulator testing only, not a physical SIM bridge."""
import asyncio
import json
import logging
import time
from pathlib import Path

from bumble import hci, hfp, rfcomm
from bumble.device import Device
from bumble.keys import JsonKeyStore
from bumble.transport import open_transport

logging.basicConfig(level=logging.INFO)
REPORT = Path(__file__).resolve().parent.parent / '.localvoice-pc' / 'bluetooth-probe.json'
state = {'transport': 'android-netsim', 'advertising': False, 'hfpConnected': False,
         'scoConnected': False, 'receivedAudioBytes': 0, 'pcmValidated': False, 'realCallValidated': False}


def report(verbose=True):
    state['updatedAt'] = time.time()
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    temporary = REPORT.with_suffix('.tmp')
    temporary.write_text(json.dumps(state, indent=2), encoding='utf-8')
    temporary.replace(REPORT)
    if verbose:
        print(json.dumps(state), flush=True)


async def main():
    async with await open_transport('android-netsim:name=LocalVoice-PC-HF') as transport:
        device = Device.with_hci('LocalVoice PC headset test', 'F0:F1:F2:F3:F4:F5', transport.source, transport.sink)
        device.classic_enabled = True
        device.keystore = JsonKeyStore(filename=str(REPORT.parent / 'bluetooth-test-keys.json'))
        config = hfp.HfConfiguration(supported_hf_features=[hfp.HfFeature.REMOTE_VOLUME_CONTROL],
                                     supported_hf_indicators=[], supported_audio_codecs=[hfp.AudioCodec.CVSD])

        def audio(packet):
            if packet.packet_status == hci.HCI_SynchronousDataPacket.Status.CORRECTLY_RECEIVED_DATA:
                state['receivedAudioBytes'] += len(packet.data)
                if 'firstPacketLength' not in state:
                    state['firstPacketLength'] = len(packet.data)
                    state['firstPacketHex'] = packet.data[:16].hex()
                    report()

        def sco_connected(link):
            state['scoConnected'] = True
            link.sink = audio
            def disconnected(*_):
                state['scoConnected'] = False
                report()
            link.on('disconnection', disconnected)
            report()

        async def accept_sco(connection, link_type):
            params = hfp.ESCO_PARAMETERS[hfp.DefaultCodecParameters.SCO_CVSD_D1 if link_type == hci.HCI_Connection_Complete_Event.LinkType.SCO else hfp.DefaultCodecParameters.ESCO_CVSD_S4]
            try:
                if device.host.supports_command(hci.HCI_ENHANCED_ACCEPT_SYNCHRONOUS_CONNECTION_REQUEST_COMMAND):
                    command = hci.HCI_Enhanced_Accept_Synchronous_Connection_Request_Command(bd_addr=connection.peer_address, **params.asdict())
                else:
                    command = hci.HCI_Accept_Synchronous_Connection_Request_Command(
                        bd_addr=connection.peer_address, transmit_bandwidth=params.transmit_bandwidth,
                        receive_bandwidth=params.receive_bandwidth, max_latency=params.max_latency,
                        voice_setting=int(hci.VoiceSetting(input_sample_size=hci.VoiceSetting.InputSampleSize.SIZE_16_BITS,
                                                          input_data_format=hci.VoiceSetting.InputDataFormat.TWOS_COMPLEMENT)),
                        retransmission_effort=params.retransmission_effort, packet_type=params.packet_type)
                await device.send_async_command(command)
            except Exception as error:
                state['error'] = str(error)
                report()

        def connected(dlc):
            protocol = hfp.HfProtocol(dlc, config)
            asyncio.create_task(protocol.run())
            state['hfpConnected'] = True
            report()
            connection = dlc.multiplexer.l2cap_channel.connection
            connection.on('sco_request', lambda link_type: asyncio.create_task(accept_sco(connection, link_type)))
            connection.on('sco_connection', sco_connected)
            def closed():
                state.update(hfpConnected=False, scoConnected=False)
                report()
            dlc.once('close', closed)

        channel = rfcomm.Server(device).listen(connected)
        device.sdp_service_records = {0x10001: hfp.make_hf_sdp_records(0x10001, channel, config)}
        await device.power_on()
        await device.set_discoverable(True)
        await device.set_connectable(True)
        state['advertising'] = True
        report()
        while True:
            await asyncio.sleep(2)
            report(False)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        state.update(advertising=False, hfpConnected=False, scoConnected=False)
        report()
    except Exception as error:
        state['error'] = str(error)
        report()
        raise
