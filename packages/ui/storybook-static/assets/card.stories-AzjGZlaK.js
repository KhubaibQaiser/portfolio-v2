import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{c as s}from"./utils-C8nBGPD0.js";function p({className:r,hoverable:a=!1,children:t,...j}){return e.jsx("div",{className:s("rounded-2xl border border-border/50 bg-muted/30 p-6",a&&"transition-colors hover:border-accent/20 hover:bg-muted/50",r),...j,children:t})}function i({className:r,children:a,...t}){return e.jsx("div",{className:s("mb-4",r),...t,children:a})}function c({className:r,children:a,...t}){return e.jsx("h3",{className:s("font-semibold tracking-tight",r),...t,children:a})}function l({className:r,children:a,...t}){return e.jsx("div",{className:s("text-sm text-muted-foreground",r),...t,children:a})}p.__docgenInfo={description:"",methods:[],displayName:"Card",props:{children:{required:!0,tsType:{name:"ReactNode"},description:""},hoverable:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};i.__docgenInfo={description:"",methods:[],displayName:"CardHeader"};c.__docgenInfo={description:"",methods:[],displayName:"CardTitle"};l.__docgenInfo={description:"",methods:[],displayName:"CardContent"};const H={title:"Primitives/Card",component:p,argTypes:{hoverable:{control:"boolean"}}},n={args:{children:e.jsxs(e.Fragment,{children:[e.jsx(i,{children:e.jsx(c,{children:"Card Title"})}),e.jsx(l,{children:"This is the card content. It provides additional details about the topic."})]})}},d={args:{hoverable:!0,children:e.jsxs(e.Fragment,{children:[e.jsx(i,{children:e.jsx(c,{children:"Hoverable Card"})}),e.jsx(l,{children:"Hover over this card to see the accent border transition."})]})}},o={render:()=>e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",maxWidth:"600px"},children:["React","TypeScript","Next.js","Tailwind"].map(r=>e.jsxs(p,{hoverable:!0,children:[e.jsx(i,{children:e.jsx(c,{children:r})}),e.jsxs(l,{children:["Expert-level proficiency with ",r,"."]})]},r))})};var m,h,C;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    children: <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>
          This is the card content. It provides additional details about the
          topic.
        </CardContent>
      </>
  }
}`,...(C=(h=n.parameters)==null?void 0:h.docs)==null?void 0:C.source}}};var u,x,v;d.parameters={...d.parameters,docs:{...(u=d.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    hoverable: true,
    children: <>
        <CardHeader>
          <CardTitle>Hoverable Card</CardTitle>
        </CardHeader>
        <CardContent>
          Hover over this card to see the accent border transition.
        </CardContent>
      </>
  }
}`,...(v=(x=d.parameters)==null?void 0:x.docs)==null?void 0:v.source}}};var f,g,b;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    maxWidth: "600px"
  }}>
      {["React", "TypeScript", "Next.js", "Tailwind"].map(title => <Card key={title} hoverable>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>Expert-level proficiency with {title}.</CardContent>
        </Card>)}
    </div>
}`,...(b=(g=o.parameters)==null?void 0:g.docs)==null?void 0:b.source}}};const N=["Default","Hoverable","Grid"];export{n as Default,o as Grid,d as Hoverable,N as __namedExportsOrder,H as default};
