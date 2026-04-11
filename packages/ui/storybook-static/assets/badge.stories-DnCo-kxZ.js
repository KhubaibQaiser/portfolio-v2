import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{c as N}from"./utils-C8nBGPD0.js";const T={default:"bg-muted text-muted-foreground",accent:"bg-accent/10 text-accent border-accent/30",outline:"border-border text-muted-foreground",success:"bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"};function a({className:S,variant:B="default",...A}){return e.jsx("span",{className:N("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",T[B],S),...A})}a.__docgenInfo={description:"",methods:[],displayName:"Badge",props:{variant:{required:!1,tsType:{name:"union",raw:'"default" | "accent" | "outline" | "success"',elements:[{name:"literal",value:'"default"'},{name:"literal",value:'"accent"'},{name:"literal",value:'"outline"'},{name:"literal",value:'"success"'}]},description:"",defaultValue:{value:'"default"',computed:!1}}}};const w={title:"Primitives/Badge",component:a,argTypes:{variant:{control:"select",options:["default","accent","outline","success"]}}},r={args:{children:"React",variant:"default"}},t={args:{children:"TypeScript",variant:"accent"}},n={args:{children:"Next.js",variant:"outline"}},s={args:{children:"Available",variant:"success"}},c={render:()=>e.jsxs("div",{style:{display:"flex",gap:"8px",flexWrap:"wrap"},children:[e.jsx(a,{variant:"default",children:"React"}),e.jsx(a,{variant:"accent",children:"TypeScript"}),e.jsx(a,{variant:"outline",children:"Next.js"}),e.jsx(a,{variant:"success",children:"Available"})]})};var i,l,o;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    children: "React",
    variant: "default"
  }
}`,...(o=(l=r.parameters)==null?void 0:l.docs)==null?void 0:o.source}}};var d,u,p;t.parameters={...t.parameters,docs:{...(d=t.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    children: "TypeScript",
    variant: "accent"
  }
}`,...(p=(u=t.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};var m,g,v;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    children: "Next.js",
    variant: "outline"
  }
}`,...(v=(g=n.parameters)==null?void 0:g.docs)==null?void 0:v.source}}};var f,x,h;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    children: "Available",
    variant: "success"
  }
}`,...(h=(x=s.parameters)==null?void 0:x.docs)==null?void 0:h.source}}};var y,b,j;c.parameters={...c.parameters,docs:{...(y=c.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  }}>
      <Badge variant="default">React</Badge>
      <Badge variant="accent">TypeScript</Badge>
      <Badge variant="outline">Next.js</Badge>
      <Badge variant="success">Available</Badge>
    </div>
}`,...(j=(b=c.parameters)==null?void 0:b.docs)==null?void 0:j.source}}};const O=["Default","Accent","Outline","Success","AllVariants"];export{t as Accent,c as AllVariants,r as Default,n as Outline,s as Success,O as __namedExportsOrder,w as default};
