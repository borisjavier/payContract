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

    const ownerPrivKey = bsv.PrivateKey.fromWIF('L3rjyArDQLsB3vCtX31rdyyxWyX21rJLHPxYbLmECjNRh7yA3bsu')
    const owner = Addr(ownerPrivKey.toAddress().toByteString());//Dirección BSV-contrato del dueño del contrato
    const currentDate: bigint = BigInt(Math.floor(Date.now() / 1000));
    const tx0 = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836')
    const txIdPago = toByteString('b1a7597134f1edbb9ab2dd421458c78ec58ae92a08f2a3294dc28556d762680d');
    await PaymentContract.loadArtifact()

    
    const txResponse = await provider.getTransaction(txId);
    
    const instance = PaymentContract.fromTx(txResponse, atOutputIndex)
    await instance.connect(signer); //getDefaultSigner(privateKey)
    
    const datas: FixedArray<Timestamp, typeof N> = 
    [1726087745n, 1726087805n, 1726087865n]
   
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
        if(dataPayments[i].timestamp < currentDate && dataPayments[i].txid == tx0) {
            console.log(`${dataPayments[i].timestamp} es menor que ${currentDate} y ${dataPayments[i].txid} no es igual a ${tx0}`)
            dataPayments[i] = {
                timestamp: currentDate,
                txid: txIdPago,
            }
        } else {
            console.log(`${dataPayments[i].timestamp} no es menor que ${currentDate} o bien ${dataPayments[i].txid} no es igual a ${tx0}`)
        }
    }
    console.log('dataPayments desde call.ts: ', dataPayments)
    const qtyTokens: bigint = 50000n
    
    try {
        const nextInstance = instance.next();
        nextInstance.owner = owner;
        nextInstance.dataPayments = dataPayments;
        nextInstance.qtyTokens = qtyTokens;
        nextInstance.isValid = true;
        const callContract = async () => instance.methods.pay(
             // findSigs filtra las firmas relevantes
             (sigResp) => findSig(sigResp, publicKey),
             pubKey,
             currentDate,
             txIdPago,
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
        console.log(`payScript: ${JSON.stringify(nextInstance.payScript)}`)
        
    } catch (error) {
        console.error('Contract call failed:', error)
    }


}
main('e68c461679033e8b5be198ac3283784968e215634e4d6f2e8af69a7d489cc095').catch(console.error);