namespace eventmesh;

entity Lock {
    key resource : String;
}

entity RelatedResource {
    key Resource : Association to Lock;
}

