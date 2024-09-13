//payConctract.ts
import {
    SmartContract,
    method,
    prop,
    assert,
    PubKey,
    Sig,
    Addr,
    hash256,
    ByteString,
    FixedArray,
    toByteString,
    fill
} from 'scrypt-ts';

export type Timestamp = bigint
export type TxId = ByteString

export type Payment = {
    timestamp: Timestamp
    txid: TxId
}

export const N = 3

export type Payments = FixedArray<Payment, typeof N>


export class PaymentContract extends SmartContract {
    @prop(true)
    owner: Addr;

    @prop()
    readonly adminPubKey: PubKey;

    @prop()
    readonly pagoGN: bigint;

    @prop(true)
    dataPayments: Payments;

    @prop(true)
    isValid: boolean;

    @prop()
    readonly EMPTY: TxId;


    constructor(
        owner: Addr,
        adminPubKey: PubKey,
        pagoGN: bigint,
        datas: FixedArray<Timestamp, typeof N>,
        txids: FixedArray<ByteString, typeof N>
    ) {
        super(...arguments);
        this.owner = owner;
        this.adminPubKey = adminPubKey;
        this.pagoGN = pagoGN;
        this.dataPayments = fill({
            timestamp: 0n,
            txid: toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836')
        }, N);
        for (let i = 0; i < N; i++) {
            this.dataPayments[i] = {
                timestamp: datas[i],
                txid: txids[i]
            }
        }
        this.isValid = true;
        this.EMPTY = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'); //'0' is not a valid hex so I took this old useless transaction as a zero value
    }

    @method()
    public pay(    
        signature: Sig, 
        publicKey: PubKey,
        currentDate: bigint,
        txIdPago: ByteString
    ) {

        assert(this.checkSig(signature, publicKey), 'Signature verification failed')

        this.updateArr(currentDate, txIdPago)
       
        assert(this.isValid, 'Contract is no longer valid'); 
        
        let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput()
        }
        this.debug.diffOutputs(outputs);
        assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch')
    }

    @method()
    updateArr(currentDate: Timestamp, txid: TxId): void {
        console.log('Datos: ', currentDate + ' ' + txid)
        for (let i = 0; i < N; i++) {
            
            if(this.dataPayments[i].timestamp < currentDate && this.dataPayments[i].txid == this.EMPTY) {
             console.log('La condición se cumplió')
             this.dataPayments[i] = {
                timestamp: currentDate,
                txid: txid
            }
            console.log(`${this.dataPayments[i].timestamp} no es menor que ${currentDate} y peor aún, ${this.dataPayments[i].txid} es ${this.EMPTY}`)
            }
         }
    }


    
    @method() // This method is a future development
    public transferOwnership( 
        signature: Sig, 
        publicKey: PubKey,
        newOwner: Addr
    ) {
        // contract is still valid
        assert(this.isValid, 'Contract is no longer valid');

        

        this.isValid = false;
        this.owner = newOwner;//must validate identity in a different contract


        // admin verification
        assert(this.checkSig(signature, publicKey), 'Signature verification failed')
        //TO DO: when transferred, create a contract with data from the last state of this one on behalf of the new owner
    }
}

//deploy.ts
import { PaymentContract, Timestamp, N } from './src/contracts/payContract';
import { bsv, DefaultProvider, TestWallet, PubKey, Addr, ByteString, FixedArray } from 'scrypt-ts';
import { myPrivateKey, adminPublicKey } from './config';

async function main() {
    // Clave privada del publicador del contrato
    const privateKey = bsv.PrivateKey.fromWIF(myPrivateKey);
    
    // Convertir las claves públicas a objetos PubKey
    const adminPubKey: PubKey = PubKey(adminPublicKey);

    // Parámetros del contrato
    const pagoGN = BigInt(50000); // Pago en quarks

        const datas: FixedArray<Timestamp, typeof N> = [1726087745n, 1726087805n, 1726087865n]

        const txids: FixedArray<ByteString, typeof N> = [
            '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836', '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836', '501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'    
        ]

    const ownerPrivKey = bsv.PrivateKey.fromWIF('L3rjyArDQLsB3vCtX31rdyyxWyX21rJLHPxYbLmECjNRh7yA3bsu')
    const owner = Addr(ownerPrivKey.toAddress().toByteString());//Dirección BSV-contrato del dueño del contrato

    // Crear instancia del contrato original
    await PaymentContract.loadArtifact();
    const contract = new PaymentContract(owner, adminPubKey, pagoGN, datas, txids);
    
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
}

main().catch(console.error);


//call.ts
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
            console.log(`El problema es: ${dataPayments[i].timestamp} no es menor que ${currentDate} o bien ${dataPayments[i].txid} no es igual a ${tx0}`)
        }
    }
    console.log('dataPayments desde call.ts: ', dataPayments)
    
    try {
        const nextInstance = instance.next();
        nextInstance.owner = owner;
        nextInstance.dataPayments = dataPayments;
        nextInstance.isValid = true;
        const { tx: unlockTx } = await instance.methods.pay(
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
      
        console.log('Contract unlocked, transaction ID:', unlockTx.id);
        
    } catch (error) {
        console.error('Contract call failed:', error)
    }


}
main('59a64fd9ace71fb2cf54bb81e53525d8ba978cd006899c0e45dac1136cd926e9').catch(console.error);