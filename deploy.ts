import { PaymentContract, Timestamp, N } from './src/contracts/payContract';
import { bsv, DefaultProvider, TestWallet, PubKey, Addr, ByteString, FixedArray } from 'scrypt-ts';
import { myPrivateKey, adminPublicKey } from './config';

async function main() {
    // Clave privada del publicador del contrato
    const privateKey = bsv.PrivateKey.fromWIF(myPrivateKey);
    
    // Convertir las claves públicas a objetos PubKey
    const adminPubKey: PubKey = PubKey(adminPublicKey);

    // Parámetros del contrato
    const qtyTokens = BigInt(50000); // Pago en quarks

        const datas: FixedArray<Timestamp, typeof N> = [1726598373n, 1726598433n, 1726598493n]

        const txids: FixedArray<ByteString, typeof N> = [
            '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836', '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836', '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'    
        ]

    
    const ownerPubKey = bsv.PublicKey.fromHex('02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db');//Alice's Pubkey
    const owner = Addr(ownerPubKey.toAddress().toByteString());//Dirección BSV-contrato del dueño del contrato
    const PubKeyGN = bsv.PublicKey.fromHex('02e750d107190e9a8a944bc14f485c89483a5baa23bc66f2327759a60035312fcc'); //pubKey de dirección GN del dueño del contrato
    const addressGN = Addr(PubKeyGN.toAddress().toByteString());
    const amountQuarks = 2125n;

    // Crear instancia del contrato original
    await PaymentContract.loadArtifact();
    const contract = new PaymentContract(owner, adminPubKey, addressGN, amountQuarks, qtyTokens, datas, txids);
    
    const signer = new TestWallet(
        privateKey,
        new DefaultProvider({
            network: bsv.Networks.mainnet,
        })
    );

    await contract.connect(signer);

    // Desplegar el contrato original
    const deployTx = await contract.deploy(1);
    console.log(`Contract deployed at ${deployTx.id}`);
    console.log(`State: ${JSON.stringify(contract.dataPayments)}`)
    console.log(`addressOwner: ${JSON.stringify(contract.owner)}`)
    console.log(`addressGN: ${JSON.stringify(contract.addressGN)}`)
}

main().catch(console.error);
