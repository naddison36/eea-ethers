"use strict";

import { Block, TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider";
import { getAddress, getContractAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { hexDataLength, hexDataSlice, hexValue, hexZeroPad, isHexString } from "@ethersproject/bytes";
import { AddressZero } from "@ethersproject/constants";
import * as errors from "@ethersproject/errors";
import { shallowCopy } from "@ethersproject/properties";

import { parse as parseTransaction } from "./eeaTransaction";

export type FormatFunc = (value: any) => any;

export type FormatFuncs = { [ key: string ]: FormatFunc };

export type Formats = {
    transaction: FormatFuncs,
    transactionRequest: FormatFuncs,
    receipt: FormatFuncs,
    receiptLog: FormatFuncs,
    block: FormatFuncs,
    blockWithTransactions: FormatFuncs,
    filter: FormatFuncs,
    filterLog: FormatFuncs,
};

// TODO remove this once Ethers exports the Formatter so it can just be extended
class Formatter {
    readonly formats: Formats;

    constructor() {
        errors.checkNew(new.target, Formatter);
        this.formats = this.getDefaultFormats();
    }

    getDefaultFormats(): Formats {
        let formats: Formats = <Formats>({ });

        let address = this.address.bind(this);
        let bigNumber = this.bigNumber.bind(this);
        let blockTag = this.blockTag.bind(this);
        let data = this.data.bind(this);
        let hash = this.hash.bind(this);
        let hex = this.hex.bind(this);
        let number = this.number.bind(this);

        let strictData = (v: any) => { return this.data(v, true); };

        formats.transaction = {
            hash: hash,

            blockHash: Formatter.allowNull(hash, null),
            blockNumber: Formatter.allowNull(number, null),
            transactionIndex: Formatter.allowNull(number, null),

            confirmations: Formatter.allowNull(number, null),

            from: address,

            gasPrice: bigNumber,
            gasLimit: bigNumber,
            to: Formatter.allowNull(address, null),
            value: bigNumber,
            nonce: number,
            data: data,

            r: Formatter.allowNull(this.uint256),
            s: Formatter.allowNull(this.uint256),
            v: Formatter.allowNull(number),

            creates: Formatter.allowNull(address, null),

            raw: Formatter.allowNull(data),
        };

        formats.transactionRequest = {
            from: Formatter.allowNull(address),
            nonce: Formatter.allowNull(number),
            gasLimit: Formatter.allowNull(bigNumber),
            gasPrice: Formatter.allowNull(bigNumber),
            to: Formatter.allowNull(address),
            value: Formatter.allowNull(bigNumber),
            data: Formatter.allowNull(strictData),
        };

        formats.receiptLog = {
            transactionLogIndex: Formatter.allowNull(number),
            transactionIndex: number,
            blockNumber: number,
            transactionHash: hash,
            address: address,
            topics: Formatter.arrayOf(hash),
            data: data,
            logIndex: number,
            blockHash: hash,
        };

        formats.receipt = {
            to: Formatter.allowNull(this.address),
            from: Formatter.allowNull(this.address),
            contractAddress: Formatter.allowNull(address, null),
            transactionIndex: number,
            root: Formatter.allowNull(hash),
            gasUsed: bigNumber,
            logsBloom: Formatter.allowNull(data),// @TODO: should this be data?
            blockHash: hash,
            transactionHash: hash,
            logs: Formatter.arrayOf(this.receiptLog.bind(this)),
            blockNumber: number,
            confirmations: Formatter.allowNull(number, null),
            cumulativeGasUsed: bigNumber,
            status: Formatter.allowNull(number)
        };

        formats.block = {
            hash: hash,
            parentHash: hash,
            number: number,

            timestamp: number,
            nonce: Formatter.allowNull(hex),
            difficulty: this.difficulty.bind(this),

            gasLimit: bigNumber,
            gasUsed: bigNumber,

            miner: address,
            extraData: data,

            transactions: Formatter.allowNull(Formatter.arrayOf(hash)),
        };

        formats.blockWithTransactions = shallowCopy(formats.block);
        formats.blockWithTransactions.transactions = Formatter.allowNull(Formatter.arrayOf(this.transactionResponse.bind(this)));

        formats.filter = {
            fromBlock: Formatter.allowNull(blockTag, undefined),
            toBlock: Formatter.allowNull(blockTag, undefined),
            blockHash: Formatter.allowNull(hash, undefined),
            address: Formatter.allowNull(address, undefined),
            topics: Formatter.allowNull(this.topics.bind(this), undefined),
        };

        formats.filterLog = {
            blockNumber: Formatter.allowNull(number),
            blockHash: Formatter.allowNull(hash),
            transactionIndex: number,

            removed: Formatter.allowNull(this.boolean.bind(this)),

            address: address,
            data: Formatter.allowFalsish(data, "0x"),

            topics: Formatter.arrayOf(hash),

            transactionHash: hash,
            logIndex: number,
        };

        return formats;
    }

    // Requires a BigNumberish that is within the IEEE754 safe integer range; returns a number
    // Strict! Used on input.
    number(number: any): number {
        return BigNumber.from(number).toNumber();
    }

    // Strict! Used on input.
    bigNumber(value: any): BigNumber {
        return BigNumber.from(value);
    }

    // Requires a boolean, "true" or  "false"; returns a boolean
    boolean(value: any): boolean {
        if (typeof(value) === "boolean") { return value; }
        if (typeof(value) === "string") {
            value = value.toLowerCase();
            if (value === "true") { return true; }
            if (value === "false") { return false; }
        }
        throw new Error("invaid boolean - " + value);
    }

    hex(value: any, strict?: boolean): string {
        if (typeof(value) === "string") {
            if (!strict && value.substring(0, 2) !== "0x") { value = "0x" + value; }
            if (isHexString(value)) {
                return value.toLowerCase();
            }
        }
        return errors.throwError("invalid hash", errors.INVALID_ARGUMENT, {
            argument: "value",
            value: value
        });
    }

    data(value: any, strict?: boolean): string {
        let result = this.hex(value, strict);
        if ((result.length % 2) !== 0) {
            throw new Error("invalid data; odd-length - " + value);
        }
        return result;
    }

    // Requires an address
    // Strict! Used on input.
    address(value: any): string {
        return getAddress(value);
    }

    callAddress(value: any): string {
        if (!isHexString(value, 32)) { return null; }
        let address = getAddress(hexDataSlice(value, 12));
        return (address === AddressZero) ? null: address;
    }

    contractAddress(value: any): string {
        return getContractAddress(value);
    }

    // Strict! Used on input.
    blockTag(blockTag: any): string {
        if (blockTag == null) { return "latest"; }

        if (blockTag === "earliest") { return "0x0"; }

        if (blockTag === "latest" || blockTag === "pending") {
            return blockTag;
        }

        if (typeof(blockTag) === "number" || isHexString(blockTag)) {
            return hexValue(<number | string>blockTag);
        }

        throw new Error("invalid blockTag");
    }

    // Requires a hash, optionally requires 0x prefix; returns prefixed lowercase hash.
    hash(value: any, strict?: boolean): string {
        let result = this.hex(value, strict);
        if (hexDataLength(result) !== 32) {
            return errors.throwError("invalid hash", errors.INVALID_ARGUMENT, {
                argument: "value",
                value: value
            });
        }
        return result;
    }

    // Returns the difficulty as a number, or if too large (i.e. PoA network) null
    difficulty(value: any): number {
        let v = BigNumber.from(value);

        try {
            return v.toNumber();
        } catch (error) { }

        return null;
    }

    uint256(value: any): string {
        if (!isHexString(value)) {
            throw new Error("invalid uint256");
        }
        return hexZeroPad(value, 32);
    }

    _block(value: any, format: any): Block {
        if (value.author != null && value.miner == null) {
            value.miner = value.author;
        }
        return Formatter.check(format, value);
    }

    block(value: any): Block {
        return this._block(value, this.formats.block);
    }

    blockWithTransactions(value: any): Block {
        return this._block(value, this.formats.blockWithTransactions);
    }

    // Strict! Used on input.
    transactionRequest(value: any): any {
        return Formatter.check(this.formats.transactionRequest, value);
    }

    transactionResponse(transaction: any): TransactionResponse {

        // Rename gas to gasLimit
        if (transaction.gas != null && transaction.gasLimit == null) {
            transaction.gasLimit = transaction.gas;
        }

        // Some clients (TestRPC) do strange things like return 0x0 for the
        // 0 address; correct this to be a real address
        if (transaction.to && BigNumber.from(transaction.to).isZero()) {
            transaction.to = "0x0000000000000000000000000000000000000000";
        }

        // Rename input to data
        if (transaction.input != null && transaction.data == null) {
            transaction.data = transaction.input;
        }

        // If to and creates are empty, populate the creates from the transaction
        if (transaction.to == null && transaction.creates == null) {
            transaction.creates = this.contractAddress(transaction);
        }

        // @TODO: use transaction.serialize? Have to add support for including v, r, and s...
        /*
        if (!transaction.raw) {

             // Very loose providers (e.g. TestRPC) do not provide a signature or raw
             if (transaction.v && transaction.r && transaction.s) {
                 let raw = [
                     stripZeros(hexlify(transaction.nonce)),
                     stripZeros(hexlify(transaction.gasPrice)),
                     stripZeros(hexlify(transaction.gasLimit)),
                     (transaction.to || "0x"),
                     stripZeros(hexlify(transaction.value || "0x")),
                     hexlify(transaction.data || "0x"),
                     stripZeros(hexlify(transaction.v || "0x")),
                     stripZeros(hexlify(transaction.r)),
                     stripZeros(hexlify(transaction.s)),
                 ];

                 transaction.raw = rlpEncode(raw);
             }
         }
         */

        let result = Formatter.check(this.formats.transaction, transaction);

        let networkId = transaction.networkId;

        // geth-etc returns chainId
        if (transaction.chainId != null && networkId == null && result.v == null) {
            networkId = transaction.chainId;
        }

        if (isHexString(networkId)) {
            networkId = BigNumber.from(networkId).toNumber();
        }

        if (typeof(networkId) !== "number" && result.v != null) {
            networkId = (result.v - 35) / 2;
            if (networkId < 0) { networkId = 0; }
            networkId = parseInt(networkId);
        }

        if (typeof(networkId) !== "number") { networkId = 0; }

        result.networkId = networkId;

        // 0x0000... should actually be null
        if (result.blockHash && result.blockHash.replace(/0/g, "") === "x") {
            result.blockHash = null;
        }

        return result;
    }

    transaction(value: any): any {
        return parseTransaction(value);
    }

    receiptLog(value: any): any {
        return Formatter.check(this.formats.receiptLog, value);
    }

    receipt(value: any): TransactionReceipt {
        //let status = transactionReceipt.status;
        //let root = transactionReceipt.root;

        let result: TransactionReceipt = Formatter.check(this.formats.receipt, value);
        result.logs.forEach((entry, index) => {
            if (entry.transactionLogIndex == null) {
                entry.transactionLogIndex = index;
            }
        });
        if (value.status != null) {
            result.byzantium = true;
        }
        return result;
    }

    topics(value: any): any {
        if (Array.isArray(value)) {
            return value.map((v) => this.topics(v));

        } else if (value != null) {
            return this.hash(value, true);
        }

        return null;
    }

    filter(value: any): any {
        return Formatter.check(this.formats.filter, value);
    }

    filterLog(value: any): any {
        return Formatter.check(this.formats.filterLog, value);
    }

    static check(format: { [ name: string ]: FormatFunc }, object: any): any {
        let result: any = {};
        for (let key in format) {
            try {
                let value = format[key](object[key]);
                if (value !== undefined) { result[key] = value; }
            } catch (error) {
                error.checkKey = key;
                error.checkValue = object[key];
                throw error;
            }
        }
        return result;
    }

    // if value is null-ish, nullValue is returned
    static allowNull(format: FormatFunc, nullValue?: any): FormatFunc {
        return (function(value: any) {
            if (value == null) { return nullValue; }
            return format(value);
        });
    }

    // If value is false-ish, replaceValue is returned
    static allowFalsish(format: FormatFunc, replaceValue: any): FormatFunc {
        return (function(value: any) {
            if (!value) { return replaceValue; }
            return format(value);
        });
    }

    // Requires an Array satisfying check
    static arrayOf(format: FormatFunc): FormatFunc {
        return (function(array: any): Array<any> {
            if (!Array.isArray(array)) { throw new Error("not an array"); }

            let result: any = [];

            array.forEach(function(value) {
                result.push(format(value));
            });

            return result;
        });
    }
}

// Override the formatting of the transaction as it now includes the new EEA
// privateFrom, privateFor and restriction fields
export class EeaFormatter extends Formatter {

    transaction(value: any): any {
        return parseTransaction(value);
    }
}