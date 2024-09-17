import { PaymentContract, Timestamp, N } from './src/contracts/payContract';
import { bsv, findSig, WhatsonchainProvider, MethodCallOptions, PubKey, Addr, fill, toByteString, FixedArray, ByteString, TestWallet } from 'scrypt-ts';
//import { getDefaultSigner } from './tests/utils/txHelper'
import { myPrivateKey} from './config';
const privateKey = bsv.PrivateKey.fromWIF(myPrivateKey);
const provider = new WhatsonchainProvider(bsv.Networks.mainnet);
const signer = new TestWallet(
    privateKey,
    provider
);

async function main(txId: string, atOutputIndex = 0) {
    // Clave privada del admin
    const privateKey = bsv.PrivateKey.fromWIF(myPrivateKey);
    const pubKey = PubKey(privateKey.publicKey.toHex());
    const publicKey = privateKey.publicKey;

    const newOwnerPubKey = bsv.PublicKey.fromHex('038c506b4130008ff516823a3334b9df1243675a09710ce3832898e727e69d33db');//Bob's Pubkey
    const newOwner = Addr(newOwnerPubKey.toAddress().toByteString());
    const newGNPubKey = bsv.PublicKey.fromHex('025f32bdd55fbd63d689d6206399e5aedb90e116cc975b6b85c2e500a1d5de0f17');//Bob's Pubkey
    const newOwnerGN = Addr(newGNPubKey.toAddress().toByteString());
    //const currentDate: bigint = BigInt(Math.floor(Date.now() / 1000));
    const tx0 = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
    //
   
    //const txIdPago = toByteString('b1a7597134f1edbb9ab2dd421458c78ec58ae92a08f2a3294dc28556d762680d');//obtida da publicação da transação de GN
    await PaymentContract.loadArtifact()

    
    const txResponse = await provider.getTransaction(txId);
    
    const instance = PaymentContract.fromTx(txResponse, atOutputIndex)
    await instance.connect(signer); //getDefaultSigner(privateKey)
    
    const datas: FixedArray<Timestamp, typeof N> = 
    [1726598373n, 1726598433n, 1726598493n]
    //console.log('datas: ', datas)
    const txids: FixedArray<ByteString, typeof N> = [
        tx0, tx0, tx0    
    ]
    //console.log('txids: ', txids)
    const dataPayments = fill({
        timestamp: 0n,
        txid: tx0,
    }, N);
    for (let i = 0; i < N; i++) {
        dataPayments[i] = {
            timestamp: datas[i],
            txid: txids[i],
        }
    }
    console.log('dataPayments desde call.ts: ', dataPayments)
    const qtyTokens: bigint = 50000n
    
    try {
        const nextInstance = instance.next();
        //nextInstance.dataPayments = dataPayments;
        nextInstance.qtyTokens = qtyTokens;
        nextInstance.owner = newOwner;
        nextInstance.addressGN = newOwnerGN;
        nextInstance.isValid = true;
        const callContract = async () => instance.methods.transferOwnership(
             // findSigs filtra las firmas relevantes
             (sigResp) => findSig(sigResp, publicKey),
             pubKey,
             newOwner,
             newOwnerGN,
             {
                next: {
                    instance: nextInstance,
                    balance: 1,
                },

                 pubKeyOrAddrToSign: publicKey,
             } as MethodCallOptions<PaymentContract>
        );
      
        const { tx: unlockTx } = await callContract();
        console.log('Contract unlocked, transaction ID:', unlockTx.id);
        console.log(`State: ${JSON.stringify(nextInstance.dataPayments)}`)
        console.log(`addressOwner: ${JSON.stringify(nextInstance.owner)}`)
        console.log(`addressGN: ${JSON.stringify(nextInstance.addressGN)}`)
        
    } catch (error) {
        console.error('Contract call failed:', error)
    }


}
main('72b4c8ca2d1487685d46f7ffc206eeedde0bfde3e5acdf5b14047375c84ea2f8').catch(console.error);