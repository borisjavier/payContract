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

    const ownerPubKey = bsv.PublicKey.fromHex('02d9b4d8362ac9ed90ef2a7433ffbeeb1a14f1e6a0db7e3d9963f6c0629f43e2db');//Alice's Pubkey
    const owner = Addr(ownerPubKey.toAddress().toByteString());
    const currentDate: bigint = BigInt(Math.floor(Date.now() / 1000));
    const tx0 = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836');
    //
   
    const txIdPago = toByteString('b1a7597134f1edbb9ab2dd421458c78ec58ae92a08f2a3294dc28556d762680d');//obtida da publicação da transação GN
    await PaymentContract.loadArtifact()

    
    const txResponse = await provider.getTransaction(txId);
    
    const instance = PaymentContract.fromTx(txResponse, atOutputIndex)
    await instance.connect(signer); //getDefaultSigner(privateKey)
    
    const datas: FixedArray<Timestamp, typeof N> = 
    [1726596493n, 1726596553n, 1726596613n]
   
    //console.log('datas: ', datas)
    const txids: FixedArray<ByteString, typeof N> = [
        tx0, tx0, tx0    
    ]

    let isValid: boolean = true;
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
            if (i === N - 1) {
                isValid = false; // Cambiar isValid a false
                console.log("El último elemento ha sido modificado, isValid ahora es false.");
            }

            dataPayments[i] = {
                timestamp: currentDate,
                txid: txIdPago,
            }
        } else {
            console.log(`${dataPayments[i].timestamp} no es menor que ${currentDate} o bien ${dataPayments[i].txid} no es igual a ${tx0}`)
        }
    }
    console.log('dataPayments desde call.ts: ', dataPayments);
    console.log('isValid: ', isValid); // Imprimir el estado final de isValid
    const qtyTokens: bigint = 50000n
    
    try {
        const nextInstance = instance.next();
        nextInstance.owner = owner;
        nextInstance.dataPayments = dataPayments;
        nextInstance.qtyTokens = qtyTokens;
        nextInstance.isValid = isValid;
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
        console.log(`We will pay ${nextInstance.amountGN} to quarksownerGN: ${JSON.stringify(nextInstance.addressGN)} `)
        
    } catch (error) {
        console.error('Contract call failed:', error)
    }


}
main('cc8b33397b5d7ef89edee29ab3024b625b06b7ee3ad00fe6bf83f465cbae0179').catch(console.error);