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

    @prop(true)
    addressGN: Addr;

    @prop()
    readonly amountGN: bigint;

    @prop(true)
    qtyTokens: bigint;

    @prop(true)
    dataPayments: Payments;

    @prop(true)
    isValid: boolean;

    @prop()
    readonly EMPTY: TxId;


    constructor(
        owner: Addr,
        adminPubKey: PubKey,
        addressGN: Addr,
        amountGN: bigint,
        qtyTokens: bigint,
        datas: FixedArray<Timestamp, typeof N>,
        txids: FixedArray<ByteString, typeof N>
    ) {
        super(...arguments);
        this.owner = owner;
        this.adminPubKey = adminPubKey;
        this.addressGN = addressGN;
        this.amountGN = amountGN;
        this.qtyTokens = qtyTokens;
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

        assert(this.isValid, 'Contract paid. No longer valid.'); 

        this.updateArr(currentDate, txIdPago)
        
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
             if (i === N - 1) {
                this.isValid = false;
                console.log("El último elemento ha sido modificado, isValid ahora es false.");
            }
             this.dataPayments[i] = {
                timestamp: currentDate,
                txid: txid
            }
            console.log(`${this.dataPayments[i].timestamp} no es menor que ${currentDate}, y ${this.dataPayments[i].txid} es ${this.EMPTY}`)
            }
         }
    }


    
    @method() // This method is a future development
    public transferOwnership( 
        signature: Sig, 
        publicKey: PubKey,
        newOwner: Addr,
        newAddressGN: Addr
    ) {
        // admin verification
        assert(this.checkSig(signature, publicKey), 'Signature verification failed')

        // contract is still valid
        assert(this.isValid, 'Contract is no longer valid');

        this.owner = newOwner;//must validate identity in a different contract
        this.addressGN = newAddressGN;


        //TO DO: when transferred, create a contract with data from the last state of this one on behalf of the new owner
        let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput()
        }
        this.debug.diffOutputs(outputs);
        assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch')
    }
}