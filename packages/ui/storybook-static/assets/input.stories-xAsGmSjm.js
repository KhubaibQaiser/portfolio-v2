import{j as t}from"./jsx-runtime-D_zvdyIk.js";import{r as v}from"./index-DCXu2c-y.js";import{c as D}from"./utils-C8nBGPD0.js";const n=v.forwardRef(({className:w,error:o,...y},E)=>t.jsxs("div",{className:"w-full",children:[t.jsx("input",{ref:E,className:D("flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm","placeholder:text-muted-foreground/50","focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent","disabled:cursor-not-allowed disabled:opacity-50",o?"border-destructive":"border-border",w),...y}),o&&t.jsx("p",{className:"mt-1 text-xs text-destructive",children:o})]}));n.displayName="Input";n.__docgenInfo={description:"",methods:[],displayName:"Input",props:{error:{required:!1,tsType:{name:"string"},description:""}}};const P={title:"Primitives/Input",component:n,argTypes:{placeholder:{control:"text"},disabled:{control:"boolean"},error:{control:"text"},type:{control:"select",options:["text","email","password","number","url"]}}},e={args:{placeholder:"Enter your name..."}},r={args:{placeholder:"Email",error:"Please enter a valid email address"}},s={args:{placeholder:"Disabled input",disabled:!0}},a={args:{placeholder:"Enter password",type:"password"}};var d,c,l;e.parameters={...e.parameters,docs:{...(d=e.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    placeholder: "Enter your name..."
  }
}`,...(l=(c=e.parameters)==null?void 0:c.docs)==null?void 0:l.source}}};var p,i,m;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    placeholder: "Email",
    error: "Please enter a valid email address"
  }
}`,...(m=(i=r.parameters)==null?void 0:i.docs)==null?void 0:m.source}}};var u,g,f;s.parameters={...s.parameters,docs:{...(u=s.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    placeholder: "Disabled input",
    disabled: true
  }
}`,...(f=(g=s.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var x,b,h;a.parameters={...a.parameters,docs:{...(x=a.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    placeholder: "Enter password",
    type: "password"
  }
}`,...(h=(b=a.parameters)==null?void 0:b.docs)==null?void 0:h.source}}};const S=["Default","WithError","Disabled","Password"];export{e as Default,s as Disabled,a as Password,r as WithError,S as __namedExportsOrder,P as default};
