// Tiny stack VM for tiny-stack-vm-01-run-20261122: the full ISA in
// program/generator/subject/ISA.md. Node 22, stdlib only, deterministic.
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
// Runs one program on its input. Returns [exitCode, stdoutBytes].
// Exit 0 = halt; 2..11 = the traps of ISA.md, in the order ISA.md states them.
function run(p,inp){
 const n=p.length,S=new Int32Array(256);let sp=0; // data stack, 256 values
 const C=new Int32Array(64);let cp=0; // call stack, 64 return addresses
 const M=new Int32Array(256),o=new Uint8Array(65536); // memory, output
 let ol=0,ip=0,pc=0,st=0;
 const end=c=>[c,o.subarray(0,ol)];
 for(;;){
  if(st===1e6)return end(10); // step limit
  if(pc<0||pc>=n)return end(9); // pc outside the program
  const op=p[pc];
  if(!(op===0||op>0&&op<8||op>15&&op<35||op>47&&op<53||op>63&&op<66||op>79&&op<84))return end(5);
  const im=op===1?1:op===2?4:op>47&&op<52?2:0;
  if(pc+im>=n)return end(9); // immediate cut off by the program's end
  st++;const nx=pc+1+im;pc=nx; // address of the next instruction
  switch(op){
   case 0:return end(0); // HALT
   case 1: // PUSH8: byte as signed 8-bit, sign-extended
    if(sp===256)return end(3);
    S[sp++]=(p[nx-1]<<24)>>24;break;
   case 2: // PUSH32: four bytes, little-endian, signed
    if(sp===256)return end(3);
    S[sp++]=p[nx-4]|p[nx-3]<<8|p[nx-2]<<16|p[nx-1]<<24;break;
   case 3: // POP
    if(sp<1)return end(2);sp--;break;
   case 4: // DUP
    if(sp<1)return end(2);if(sp===256)return end(3);
    S[sp]=S[sp-1];sp++;break;
   case 5: // SWAP
    if(sp<2)return end(2);
    {const t=S[sp-1];S[sp-1]=S[sp-2];S[sp-2]=t;}break;
   case 6: // OVER
    if(sp<2)return end(2);if(sp===256)return end(3);
    S[sp]=S[sp-2];sp++;break;
   case 7: // ROT: ( a b c -- b c a )
    if(sp<3)return end(2);
    {const a=S[sp-3];S[sp-3]=S[sp-2];S[sp-2]=S[sp-1];S[sp-1]=a;}break;
   case 23: // NEG, wraps: -(-2147483648) is -2147483648
    if(sp<1)return end(2);S[sp-1]=-S[sp-1]|0;break;
   case 27: // NOT
    if(sp<1)return end(2);S[sp-1]=~S[sp-1];break;
   case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:
   case 26:case 28:case 29:case 30:case 32:case 33:case 34:{
    // Binary ops: ( a b -- r ), b is the top. All results wrap to 32 bits.
    if(sp<2)return end(2);
    const b=S[sp-1],a=S[sp-2];let r;
    if(op===16)r=a+b|0; // ADD
    else if(op===17)r=a-b|0; // SUB
    else if(op===18)r=Math.imul(a,b); // MUL, low 32 bits of the exact product
    else if(op===19){if(b===0)return end(4);r=a===-2147483648&&b===-1?a:a/b|0;} // DIV
    else if(op===20){if(b===0)return end(4);r=b===-1?0:a%b|0;} // MOD, sign of a
    else if(op===21){if(b===0)return end(4);r=Math.floor((a>>>0)/(b>>>0))|0;} // DIVU
    else if(op===22){if(b===0)return end(4);r=(a>>>0)%(b>>>0)|0;} // MODU
    else if(op===24)r=a&b; // AND
    else if(op===25)r=a|b; // OR
    else if(op===26)r=a^b; // XOR
    else if(op===28)r=a<<(b&31); // SHL, only the low 5 bits of the count
    else if(op===29)r=a>>(b&31); // SHR, arithmetic
    else if(op===30)r=a>>>(b&31)|0; // SHRU, logical, read back signed
    else if(op===32)r=a===b?1:0; // EQ
    else if(op===33)r=a<b?1:0; // LT, signed
    else r=(a>>>0)<(b>>>0)?1:0; // LTU, unsigned
    sp-=2;S[sp++]=r;break;}
   case 48:case 49:case 50:{ // JMP / JZ / JNZ, signed 16-bit offset from next
    const rel=(p[nx-2]|p[nx-1]<<8)<<16>>16;let t=true;
    if(op!==48){if(sp<1)return end(2);const v=S[--sp];t=op===49?v===0:v!==0;}
    if(t)pc=nx+rel;break;}
   case 51: // CALL: 64 return addresses held already traps 7
    if(cp===64)return end(7);
    C[cp++]=nx;pc=p[nx-2]|p[nx-1]<<8;break;
   case 52: // RET: empty call stack traps 8
    if(cp===0)return end(8);
    pc=C[--cp];break;
   case 64:{ // LOAD: address outside 0..255 traps 6
    if(sp<1)return end(2);
    const a=S[sp-1];if(a<0||a>255)return end(6);
    S[sp-1]=M[a];break;}
   case 65:{ // STORE: ( v addr -- ), addr is the top
    if(sp<2)return end(2);
    const a=S[sp-1];if(a<0||a>255)return end(6);
    M[a]=S[sp-2];sp-=2;break;}
   case 80:{ // PRINT: decimal ASCII, no sign but '-', no newline
    if(sp<1)return end(2);
    const s=String(S[sp-1]);
    if(ol+s.length>65536)return end(11); // output limit: writes none of it
    sp--;for(let i=0;i<s.length;i++)o[ol++]=s.charCodeAt(i);break;}
   case 81: // PUTC: one byte, v AND 255
    if(sp<1)return end(2);
    if(ol+1>65536)return end(11);
    o[ol++]=S[--sp]&255;break;
   case 82: // IN: next input byte, -1 once the input is used up
    if(sp===256)return end(3);
    S[sp++]=ip<inp.length?inp[ip++]:-1;break;
   case 83: // EXIT: code v AND 255
    if(sp<1)return end(2);
    return end(S[--sp]&255);
  }
 }
}
for(const id of readdirSync(I).sort()){
 const d=join(I,id);let p=Buffer.alloc(0),q=Buffer.alloc(0);
 try{p=readFileSync(join(d,'program.bin'))}catch{}
 try{q=readFileSync(join(d,'input.bin'))}catch{}
 const[x,y]=run(p,q),od=join(O,id);
 mkdirSync(od,{recursive:true});
 writeFileSync(join(od,'stdout.bin'),y);
 writeFileSync(join(od,'exit.txt'),x+'\n');
}
