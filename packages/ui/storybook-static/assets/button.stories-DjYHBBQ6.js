import{j as a}from"./jsx-runtime-D_zvdyIk.js";import{r as R}from"./index-DCXu2c-y.js";import{c as k}from"./utils-C8nBGPD0.js";const P={default:"bg-foreground text-background hover:opacity-90",outline:"border border-border bg-transparent text-foreground hover:bg-muted",ghost:"bg-transparent text-foreground hover:bg-muted",accent:"bg-accent text-accent-foreground hover:opacity-90"},F={sm:"h-8 px-3 text-xs rounded-md",md:"h-10 px-5 text-sm rounded-lg",lg:"h-12 px-8 text-base rounded-xl"},e=R.forwardRef(({className:I,variant:N="default",size:T="md",disabled:q,...C},M)=>a.jsx("button",{ref:M,disabled:q,className:k("inline-flex items-center justify-center gap-2 font-medium transition-all duration-200","active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",P[N],F[T],I),...C}));e.displayName="Button";e.__docgenInfo={description:"",methods:[],displayName:"Button",props:{variant:{required:!1,tsType:{name:"union",raw:'"default" | "outline" | "ghost" | "accent"',elements:[{name:"literal",value:'"default"'},{name:"literal",value:'"outline"'},{name:"literal",value:'"ghost"'},{name:"literal",value:'"accent"'}]},description:"",defaultValue:{value:'"default"',computed:!1}},size:{required:!1,tsType:{name:"union",raw:'"sm" | "md" | "lg"',elements:[{name:"literal",value:'"sm"'},{name:"literal",value:'"md"'},{name:"literal",value:'"lg"'}]},description:"",defaultValue:{value:'"md"',computed:!1}}}};const Q={title:"Primitives/Button",component:e,argTypes:{variant:{control:"select",options:["default","outline","ghost","accent"]},size:{control:"select",options:["sm","md","lg"]},disabled:{control:"boolean"}}},t={args:{children:"Button",variant:"default",size:"md"}},r={args:{children:"Get Started",variant:"accent",size:"md"}},n={args:{children:"Learn More",variant:"outline",size:"md"}},s={args:{children:"Cancel",variant:"ghost",size:"md"}},o={args:{children:"Small",variant:"default",size:"sm"}},i={args:{children:"Large Action",variant:"accent",size:"lg"}},l={args:{children:"Disabled",variant:"default",disabled:!0}},c={render:()=>a.jsxs("div",{style:{display:"flex",gap:"12px",alignItems:"center"},children:[a.jsx(e,{variant:"default",children:"Default"}),a.jsx(e,{variant:"accent",children:"Accent"}),a.jsx(e,{variant:"outline",children:"Outline"}),a.jsx(e,{variant:"ghost",children:"Ghost"})]})};var d,u,m;t.parameters={...t.parameters,docs:{...(d=t.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    children: "Button",
    variant: "default",
    size: "md"
  }
}`,...(m=(u=t.parameters)==null?void 0:u.docs)==null?void 0:m.source}}};var p,g,v;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    children: "Get Started",
    variant: "accent",
    size: "md"
  }
}`,...(v=(g=r.parameters)==null?void 0:g.docs)==null?void 0:v.source}}};var f,h,x;n.parameters={...n.parameters,docs:{...(f=n.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    children: "Learn More",
    variant: "outline",
    size: "md"
  }
}`,...(x=(h=n.parameters)==null?void 0:h.docs)==null?void 0:x.source}}};var b,S,y;s.parameters={...s.parameters,docs:{...(b=s.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    children: "Cancel",
    variant: "ghost",
    size: "md"
  }
}`,...(y=(S=s.parameters)==null?void 0:S.docs)==null?void 0:y.source}}};var z,B,j;o.parameters={...o.parameters,docs:{...(z=o.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    children: "Small",
    variant: "default",
    size: "sm"
  }
}`,...(j=(B=o.parameters)==null?void 0:B.docs)==null?void 0:j.source}}};var A,D,G;i.parameters={...i.parameters,docs:{...(A=i.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    children: "Large Action",
    variant: "accent",
    size: "lg"
  }
}`,...(G=(D=i.parameters)==null?void 0:D.docs)==null?void 0:G.source}}};var L,O,V;l.parameters={...l.parameters,docs:{...(L=l.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    children: "Disabled",
    variant: "default",
    disabled: true
  }
}`,...(V=(O=l.parameters)==null?void 0:O.docs)==null?void 0:V.source}}};var _,w,E;c.parameters={...c.parameters,docs:{...(_=c.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: "12px",
    alignItems: "center"
  }}>
      <Button variant="default">Default</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
}`,...(E=(w=c.parameters)==null?void 0:w.docs)==null?void 0:E.source}}};const U=["Default","Accent","Outline","Ghost","Small","Large","Disabled","AllVariants"];export{r as Accent,c as AllVariants,t as Default,l as Disabled,s as Ghost,i as Large,n as Outline,o as Small,U as __namedExportsOrder,Q as default};
